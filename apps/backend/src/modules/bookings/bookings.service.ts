import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalStatus } from '../approvals/schemas/approval-request.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ProjectScopedDataHelper } from '../project-access/project-scoped-data.helper';
import {
  Project,
  ProjectStatus,
} from '../projects/schemas/project.schema';
import { Unit, UnitStatus } from '../units/schemas/unit.schema';
import { UnitsService } from '../units/units.service';
import { BookingPdfService } from './booking-pdf.service';
import { toPublicBooking } from './bookings.mapper';
import {
  assertBookingStatusTransition,
  assertNonNegative,
  assertPriceConsistency,
  computeApprovedPrice,
  discountRequiresApproval,
  roundMoney,
} from './bookings.validation';
import type {
  ApproveBookingDiscountDto,
  CancelBookingDto,
  CreateBookingDto,
  ListBookingsQueryDto,
  RejectBookingDiscountDto,
  TransitionBookingDto,
  UpdateBookingDto,
} from './dto/booking.dto';
import {
  ACTIVE_BOOKING_STATUSES,
  Booking,
  type BookingDocument,
  BookingStatus,
} from './schemas/booking.schema';

export const BOOKING_APPROVAL_MODULE = 'sales';
export const BOOKING_APPROVAL_ENTITY = 'booking_discount';

const BOOKING_TO_UNIT_STATUS: Partial<Record<BookingStatus, UnitStatus>> = {
  [BookingStatus.Hold]: UnitStatus.Held,
  [BookingStatus.PendingApproval]: UnitStatus.Held,
  [BookingStatus.Reserved]: UnitStatus.Reserved,
  [BookingStatus.Booked]: UnitStatus.Booked,
  [BookingStatus.Agreement]: UnitStatus.AgreementExecuted,
  [BookingStatus.Registered]: UnitStatus.Registered,
};

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    @InjectModel(Customer.name) private readonly customerModel: Model<Customer>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Unit.name) private readonly unitModel: Model<Unit>,
    private readonly numberingService: NumberingService,
    private readonly unitsService: UnitsService,
    private readonly approvalsService: ApprovalsService,
    private readonly pdfService: BookingPdfService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly projectScope: ProjectScopedDataHelper,
  ) {}

  async create(dto: CreateBookingDto, actorId: string) {
    await this.projectScope.assertProjectAccess(
      actorId,
      dto.projectId,
      'create',
      { resourceType: 'booking' },
    );
    await this.requireProject(dto.projectId);
    const customer = await this.requireCustomer(dto.customerId);
    const unit = await this.requireUnit(dto.unitId);

    if (String(unit.projectId) !== dto.projectId) {
      throw new BadRequestException('unitId does not belong to projectId');
    }

    await this.assertNoActiveBookingForUnit(dto.unitId);

    const discount = roundMoney(dto.discount ?? 0);
    const agreedPrice = roundMoney(dto.agreedPrice);
    const approvedPrice = roundMoney(
      dto.approvedPrice ?? computeApprovedPrice(agreedPrice, discount),
    );
    assertPriceConsistency({ agreedPrice, discount, approvedPrice });
    assertNonNegative(dto.bookingAmount, 'bookingAmount');

    const jointApplicantId = this.resolveJointApplicantId(
      customer,
      dto.jointApplicantId,
    );

    const needsApproval = discountRequiresApproval({
      discount,
      agreedPrice,
      percentLimit: this.configService.get('bookingDiscountPercentLimit', {
        infer: true,
      }),
      amountLimit: this.configService.get('bookingDiscountAmountLimit', {
        infer: true,
      }),
    });

    const bookingDate = dto.bookingDate
      ? this.parseDate(dto.bookingDate, 'bookingDate')
      : new Date();
    const holdHours =
      dto.holdHours ??
      this.configService.get('bookingHoldHours', { infer: true }) ??
      48;
    const holdExpiresAt = new Date(
      bookingDate.getTime() + holdHours * 60 * 60 * 1000,
    );

    const bookingNumber = await this.numberingService.nextCode(
      NumberEntityType.BOOKING,
      { projectId: dto.projectId, projectScoped: true },
    );

    const initialStatus = needsApproval
      ? BookingStatus.PendingApproval
      : BookingStatus.Hold;

    let row: BookingDocument;
    try {
      row = await this.bookingModel.create({
        bookingNumber,
        customerId: new Types.ObjectId(dto.customerId),
        jointApplicantId,
        projectId: new Types.ObjectId(dto.projectId),
        unitId: new Types.ObjectId(dto.unitId),
        bookingDate,
        bookingAmount: roundMoney(dto.bookingAmount),
        agreedPrice,
        discount,
        approvedPrice,
        paymentPlan: this.normalizePaymentPlan(dto.paymentPlan),
        broker: this.normalizeBroker(dto.broker),
        fundingType: dto.fundingType,
        remarks: dto.remarks?.trim() ?? null,
        status: initialStatus,
        holdExpiresAt,
        discountApprovalRequired: needsApproval,
        discountApproved: !needsApproval,
        approvalRequestId: null,
        createdBy: new Types.ObjectId(actorId),
      });
    } catch (error) {
      this.rethrowDuplicateActive(error);
      throw error;
    }

    try {
      await this.unitsService.changeStatus(
        dto.unitId,
        {
          status: UnitStatus.Held,
          bookingRefId: String(row._id),
        },
        actorId,
      );
    } catch (error) {
      await this.bookingModel.findByIdAndDelete(row._id).exec();
      throw error;
    }

    if (needsApproval) {
      try {
        const approval = await this.approvalsService.create(
          dto.projectId,
          {
            module: BOOKING_APPROVAL_MODULE,
            entityType: BOOKING_APPROVAL_ENTITY,
            entityId: String(row._id),
            amount: discount,
            reason: `Booking ${bookingNumber} discount ${discount} exceeds policy limit`,
            submit: true,
          },
          actorId,
        );
        row.approvalRequestId = new Types.ObjectId(approval.data!.id);
        await row.save();
      } catch (error) {
        this.logger.warn(
          `Discount approval request not created for ${bookingNumber}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return createSuccessResponse(
      toPublicBooking(row),
      needsApproval
        ? 'Booking created on hold; discount pending approval'
        : 'Booking created on hold',
    );
  }

  async update(id: string, dto: UpdateBookingDto, actorId: string) {
    const row = await this.requireBooking(id, actorId, 'update');
    if (
      row.status !== BookingStatus.Hold &&
      row.status !== BookingStatus.PendingApproval
    ) {
      throw new BadRequestException(
        'Only hold / pending_approval bookings can be updated',
      );
    }

    if (dto.customerId !== undefined) {
      await this.requireCustomer(dto.customerId);
      row.customerId = new Types.ObjectId(dto.customerId);
    }
    if (dto.jointApplicantId !== undefined) {
      const customer = await this.requireCustomer(String(row.customerId));
      row.jointApplicantId = this.resolveJointApplicantId(
        customer,
        dto.jointApplicantId,
      );
    }
    if (dto.bookingDate !== undefined) {
      row.bookingDate = this.parseDate(dto.bookingDate, 'bookingDate');
    }
    if (dto.bookingAmount !== undefined) {
      assertNonNegative(dto.bookingAmount, 'bookingAmount');
      row.bookingAmount = roundMoney(dto.bookingAmount);
    }
    if (dto.paymentPlan !== undefined) {
      row.paymentPlan = this.normalizePaymentPlan(dto.paymentPlan);
    }
    if (dto.broker !== undefined) {
      row.broker = this.normalizeBroker(dto.broker);
    }
    if (dto.fundingType !== undefined) row.fundingType = dto.fundingType;
    if (dto.remarks !== undefined) row.remarks = dto.remarks?.trim() ?? null;

    const agreedPrice =
      dto.agreedPrice !== undefined
        ? roundMoney(dto.agreedPrice)
        : row.agreedPrice;
    const discount =
      dto.discount !== undefined ? roundMoney(dto.discount) : row.discount;
    const approvedPrice = roundMoney(
      dto.approvedPrice ?? computeApprovedPrice(agreedPrice, discount),
    );
    assertPriceConsistency({ agreedPrice, discount, approvedPrice });
    row.agreedPrice = agreedPrice;
    row.discount = discount;
    row.approvedPrice = approvedPrice;

    const needsApproval = discountRequiresApproval({
      discount,
      agreedPrice,
      percentLimit: this.configService.get('bookingDiscountPercentLimit', {
        infer: true,
      }),
      amountLimit: this.configService.get('bookingDiscountAmountLimit', {
        infer: true,
      }),
    });

    if (needsApproval && !row.discountApproved) {
      row.discountApprovalRequired = true;
      row.status = BookingStatus.PendingApproval;
    } else if (!needsApproval) {
      row.discountApprovalRequired = false;
      row.discountApproved = true;
      if (row.status === BookingStatus.PendingApproval) {
        row.status = BookingStatus.Hold;
      }
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(toPublicBooking(row), 'Booking updated');
  }

  async getById(id: string, actorId: string) {
    const row = await this.requireBooking(id, actorId, 'read');
    return createSuccessResponse(toPublicBooking(row), 'Booking retrieved');
  }

  async list(query: ListBookingsQueryDto, actorId: string) {
    if (query.projectId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        query.projectId,
        'read',
        { resourceType: 'booking' },
      );
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    let filter: FilterQuery<Booking> = {};

    if (query.status) filter.status = query.status;
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.unitId) filter.unitId = new Types.ObjectId(query.unitId);
    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      filter.bookingNumber = { $regex: term, $options: 'i' };
    }

    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;
        filter = await this.projectScope.mergeAuthorisedProjectFilter(
      actorId,
      filter,
    );

const [items, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.bookingModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicBooking(item)),
      'Bookings fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async transition(
    id: string,
    dto: TransitionBookingDto,
    actorId: string,
  ) {
    const row = await this.requireBooking(id, actorId, 'update');
    const next = dto.status;

    if (
      ![
        BookingStatus.Reserved,
        BookingStatus.Booked,
        BookingStatus.Agreement,
        BookingStatus.Registered,
      ].includes(next)
    ) {
      throw new BadRequestException(
        'Use cancel / expire / approve-discount endpoints for non-workflow transitions',
      );
    }

    assertBookingStatusTransition(row.status, next);

    if (
      next === BookingStatus.Reserved &&
      row.discountApprovalRequired &&
      !row.discountApproved
    ) {
      throw new BadRequestException(
        'Discount exceeds policy limit and must be approved before reservation',
      );
    }

    const unitStatus = BOOKING_TO_UNIT_STATUS[next];
    if (!unitStatus) {
      throw new BadRequestException(`No unit mapping for status ${next}`);
    }

    await this.unitsService.changeStatus(
      String(row.unitId),
      {
        status: unitStatus,
        bookingRefId: String(row._id),
      },
      actorId,
    );

    row.status = next;
    if (
      next === BookingStatus.Reserved ||
      next === BookingStatus.Booked ||
      next === BookingStatus.Agreement ||
      next === BookingStatus.Registered
    ) {
      row.holdExpiresAt = null;
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    if (next === BookingStatus.Booked && !row.pdfPath) {
      await this.generateBookingForm(String(row._id), actorId);
      const refreshed = await this.requireBooking(id, actorId, 'update');
      return createSuccessResponse(
        toPublicBooking(refreshed),
        `Booking transitioned to ${next}`,
      );
    }

    return createSuccessResponse(
      toPublicBooking(row),
      `Booking transitioned to ${next}`,
    );
  }

  async approveDiscount(
    id: string,
    dto: ApproveBookingDiscountDto,
    actorId: string,
  ) {
    const row = await this.requireBooking(id, actorId, 'update');
    if (row.status !== BookingStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending_approval bookings can have discounts approved',
      );
    }

    if (row.approvalRequestId) {
      const approval = await this.approvalsService.approve(
        String(row.projectId),
        String(row.approvalRequestId),
        actorId,
        { comment: dto.comment ?? 'Booking discount approved' },
      );
      if (
        approval.data?.status !== ApprovalStatus.Approved &&
        approval.data?.status !== ApprovalStatus.Pending
      ) {
        throw new BadRequestException('Discount approval was not completed');
      }
      if (approval.data.status === ApprovalStatus.Pending) {
        row.set('updatedBy', new Types.ObjectId(actorId));
        await row.save();
        return createSuccessResponse(
          toPublicBooking(row),
          'Booking discount approval step completed',
        );
      }
    }

    row.discountApproved = true;
    row.discountApprovalRequired = true;
    row.status = BookingStatus.Hold;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicBooking(row),
      'Booking discount approved; booking is on hold',
    );
  }

  async rejectDiscount(
    id: string,
    dto: RejectBookingDiscountDto,
    actorId: string,
  ) {
    const row = await this.requireBooking(id, actorId, 'update');
    if (row.status !== BookingStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending_approval bookings can have discounts rejected',
      );
    }

    if (row.approvalRequestId) {
      await this.approvalsService.reject(
        String(row.projectId),
        String(row.approvalRequestId),
        actorId,
        { comment: dto.reason },
      );
    }

    return this.cancel(id, { reason: dto.reason }, actorId);
  }

  async cancel(id: string, dto: CancelBookingDto, actorId: string) {
    const row = await this.requireBooking(id, actorId, 'update');
    if (
      row.status === BookingStatus.Cancelled ||
      row.status === BookingStatus.Expired ||
      row.status === BookingStatus.Registered
    ) {
      throw new BadRequestException(
        `Cannot cancel booking in status ${row.status}`,
      );
    }

    if (
      row.status === BookingStatus.Booked ||
      row.status === BookingStatus.Agreement
    ) {
      throw new BadRequestException(
        'Booked/agreement cancellations must use the booking-cancellation workflow (unit is released only after refund approval)',
      );
    }

    assertBookingStatusTransition(row.status, BookingStatus.Cancelled);
    return this.finalizeCancellation(id, dto.reason ?? null, actorId);
  }

  /**
   * Final step of the booking-cancellation workflow — cancels booking and
   * releases the unit. Prefer BookingCancellationsService for post-collection cases.
   */
  async finalizeCancellation(
    id: string,
    reason: string | null,
    actorId: string,
  ) {
    const row = await this.requireBooking(id, actorId, 'update');
    if (row.status === BookingStatus.Cancelled) {
      return createSuccessResponse(toPublicBooking(row), 'Booking already cancelled');
    }
    if (
      row.status === BookingStatus.Expired ||
      row.status === BookingStatus.Registered
    ) {
      throw new BadRequestException(
        `Cannot finalize cancellation for booking in status ${row.status}`,
      );
    }

    assertBookingStatusTransition(row.status, BookingStatus.Cancelled);
    await this.releaseUnit(String(row.unitId), actorId);

    row.status = BookingStatus.Cancelled;
    row.cancelledAt = new Date();
    row.cancellationReason = reason?.trim() ?? null;
    row.holdExpiresAt = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicBooking(row),
      'Booking cancelled and unit released',
    );
  }

  async generateBookingForm(id: string, actorId: string) {
    const row = await this.requireBooking(id, actorId, 'update');
    if (
      ![
        BookingStatus.Reserved,
        BookingStatus.Booked,
        BookingStatus.Agreement,
        BookingStatus.Registered,
      ].includes(row.status)
    ) {
      throw new BadRequestException(
        'Booking form PDF can be generated from reserved status onward',
      );
    }

    const pdfPath = await this.pdfService.generate(toPublicBooking(row));
    row.pdfPath = pdfPath;
    row.pdfGeneratedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicBooking(row),
      'Booking form PDF generated',
    );
  }

  /** Expires holds past holdExpiresAt and releases units. */
  async expireHolds(actorId?: string) {
    const now = new Date();
    const systemActor = actorId ?? new Types.ObjectId().toHexString();
    const expired = await this.bookingModel
      .find({
        status: {
          $in: [BookingStatus.Hold, BookingStatus.PendingApproval],
        },
        holdExpiresAt: { $lte: now },
      })
      .exec();

    let count = 0;
    for (const row of expired) {
      try {
        await this.releaseUnit(String(row.unitId), systemActor);
        row.status = BookingStatus.Expired;
        row.expiredAt = now;
        row.holdExpiresAt = null;
        row.set('updatedBy', new Types.ObjectId(systemActor));
        await row.save();
        count += 1;
      } catch (error) {
        this.logger.warn(
          `Failed to expire booking ${row.bookingNumber}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return createSuccessResponse(
      { expired: count },
      `Expired ${count} booking hold(s)`,
    );
  }

  private async releaseUnit(unitId: string, actorId: string) {
    const unit = await this.unitModel.findById(unitId).exec();
    if (!unit) return;

    if (
      unit.status === UnitStatus.Held ||
      unit.status === UnitStatus.Reserved
    ) {
      await this.unitsService.changeStatus(
        unitId,
        { status: UnitStatus.Available, bookingRefId: null },
        actorId,
      );
      return;
    }

    if (
      unit.status === UnitStatus.Booked ||
      unit.status === UnitStatus.AgreementExecuted
    ) {
      await this.unitsService.changeStatus(
        unitId,
        { status: UnitStatus.Cancelled, bookingRefId: null },
        actorId,
      );
      await this.unitsService.changeStatus(
        unitId,
        { status: UnitStatus.Available, bookingRefId: null },
        actorId,
      );
    }
  }

  private async assertNoActiveBookingForUnit(unitId: string) {
    const existing = await this.bookingModel
      .findOne({
        unitId: new Types.ObjectId(unitId),
        status: { $in: ACTIVE_BOOKING_STATUSES },
      })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(
        `Unit already has an active booking (${existing.bookingNumber})`,
      );
    }
  }

  private resolveJointApplicantId(
    customer: Customer & { jointApplicant?: { fullName?: string | null } },
    jointApplicantId?: string | null,
  ): Types.ObjectId | null {
    if (jointApplicantId === undefined || jointApplicantId === null) {
      return null;
    }
    if (!customer.jointApplicant?.fullName) {
      throw new BadRequestException(
        'Customer has no joint applicant; jointApplicantId cannot be set',
      );
    }
    return new Types.ObjectId(jointApplicantId);
  }

  private normalizePaymentPlan(plan?: CreateBookingDto['paymentPlan']) {
    if (!plan) {
      return { name: null, installments: [] };
    }
    return {
      name: plan.name?.trim() ?? null,
      installments: (plan.installments ?? []).map((i) => ({
        sequence: i.sequence,
        label: i.label.trim(),
        dueDate: i.dueDate ? this.parseDate(i.dueDate, 'dueDate') : null,
        amount: roundMoney(i.amount),
        percent: i.percent ?? null,
      })),
    };
  }

  private normalizeBroker(broker?: CreateBookingDto['broker']) {
    if (!broker) {
      return {
        name: null,
        firmName: null,
        phone: null,
        email: null,
        commissionPercent: null,
      };
    }
    return {
      name: broker.name?.trim() ?? null,
      firmName: broker.firmName?.trim() ?? null,
      phone: broker.phone?.trim() ?? null,
      email: broker.email?.trim().toLowerCase() ?? null,
      commissionPercent: broker.commissionPercent ?? null,
    };
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private rethrowDuplicateActive(error: unknown): void {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new ConflictException(
        'Unit already has an active booking (double booking prevented)',
      );
    }
  }

  private async requireBooking(
    id: string,
    actorId?: string,
    action: 'read' | 'update' | 'create' | 'approve' = 'read',
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Booking not found');
    }
    const row = await this.bookingModel.findById(id).exec();
    if (!row) throw new NotFoundException('Booking not found');

    if (actorId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        String(row.projectId),
        action,
        { resourceType: 'booking', resourceId: id },
      );
    }
    return row;
  }

  private async requireCustomer(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customerId');
    }
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  private async requireUnit(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid unitId');
    }
    const unit = await this.unitModel.findById(id).exec();
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) throw new NotFoundException('Project not found');
    if (
      project.status === ProjectStatus.Cancelled ||
      project.status === ProjectStatus.Closed
    ) {
      throw new BadRequestException(
        `Project is ${project.status}; bookings cannot be created`,
      );
    }
    return project;
  }
}
