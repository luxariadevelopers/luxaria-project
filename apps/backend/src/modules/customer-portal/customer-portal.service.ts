import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import type { AuthUser } from '../auth/types/auth-user.type';
import { Booking } from '../bookings/schemas/booking.schema';
import {
  Customer,
  CustomerStatus,
} from '../customers/schemas/customer.schema';
import {
  CustomerReceipt,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  CustomerWarranty,
  WarrantyStatus,
} from '../customer-warranties/schemas/customer-warranty.schema';
import {
  DailyProgressReport,
  DprStatus,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  PaymentDemand,
  PaymentDemandStatus,
} from '../payment-schedules/schemas/payment-demand.schema';
import {
  PaymentSchedule,
  PaymentScheduleStatus,
} from '../payment-schedules/schemas/payment-schedule.schema';
import { SaleAgreement } from '../sale-agreements/schemas/sale-agreement.schema';
import type { RaiseCustomerWarrantyDto } from './dto/customer-portal.dto';
import type {
  ConstructionProgressSummary,
  CustomerPortalOverview,
  CustomerPortalProfile,
} from './customer-portal.types';

const NOT_DELETED = { isDeleted: { $ne: true } } as const;

type ResolvedCustomer = Customer & { _id: Types.ObjectId };

@Injectable()
export class CustomerPortalService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<Customer>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    @InjectModel(PaymentDemand.name)
    private readonly demandModel: Model<PaymentDemand>,
    @InjectModel(CustomerReceipt.name)
    private readonly receiptModel: Model<CustomerReceipt>,
    @InjectModel(PaymentSchedule.name)
    private readonly scheduleModel: Model<PaymentSchedule>,
    @InjectModel(SaleAgreement.name)
    private readonly agreementModel: Model<SaleAgreement>,
    @InjectModel(CustomerWarranty.name)
    private readonly warrantyModel: Model<CustomerWarranty>,
    @InjectModel(DailyProgressReport.name)
    private readonly dprModel: Model<DailyProgressReport>,
  ) {}

  async getMe(actor: AuthUser) {
    const customer = await this.requireLinkedCustomer(actor);
    return createSuccessResponse(
      this.toProfile(customer),
      'Customer portal profile',
    );
  }

  async getBookings(actor: AuthUser, customerId?: string) {
    const customer = await this.resolveCustomer(actor, customerId);
    const rows = await this.bookingModel
      .find({ ...NOT_DELETED, customerId: customer._id })
      .sort({ bookingDate: -1 })
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((row) => ({
        id: String(row._id),
        bookingNumber: row.bookingNumber,
        projectId: String(row.projectId),
        unitId: String(row.unitId),
        bookingDate: new Date(row.bookingDate).toISOString(),
        approvedPrice: row.approvedPrice,
        status: row.status,
        fundingType: row.fundingType,
      })),
      'Customer bookings',
    );
  }

  async getDemands(actor: AuthUser, customerId?: string) {
    const customer = await this.resolveCustomer(actor, customerId);
    const rows = await this.demandModel
      .find({ ...NOT_DELETED, customerId: customer._id })
      .sort({ dueDate: 1, issuedAt: -1 })
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((row) => ({
        id: String(row._id),
        demandNumber: row.demandNumber,
        projectId: String(row.projectId),
        bookingId: String(row.bookingId),
        milestone: row.milestone,
        dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
        totalAmount: row.totalAmount,
        collectedAmount: row.collectedAmount,
        outstandingAmount: this.round2(
          row.totalAmount - row.collectedAmount,
        ),
        status: row.status,
        issuedAt: new Date(row.issuedAt).toISOString(),
      })),
      'Customer payment demands',
    );
  }

  async getReceipts(actor: AuthUser, customerId?: string) {
    const customer = await this.resolveCustomer(actor, customerId);
    const rows = await this.receiptModel
      .find({ ...NOT_DELETED, customerId: customer._id })
      .sort({ receiptDate: -1 })
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((row) => ({
        id: String(row._id),
        receiptNumber: row.receiptNumber,
        projectId: String(row.projectId),
        bookingId: String(row.bookingId),
        unitId: String(row.unitId),
        receiptDate: new Date(row.receiptDate).toISOString(),
        amount: row.amount,
        paymentMode: row.paymentMode,
        sourceType: row.sourceType,
        status: row.status,
        allocatedAmount: row.allocatedAmount,
        unallocatedAmount: row.unallocatedAmount,
      })),
      'Customer receipts',
    );
  }

  async getPaymentSchedules(actor: AuthUser, customerId?: string) {
    const customer = await this.resolveCustomer(actor, customerId);
    const rows = await this.scheduleModel
      .find({
        ...NOT_DELETED,
        customerId: customer._id,
        status: PaymentScheduleStatus.Active,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((row) => ({
        id: String(row._id),
        scheduleNumber: row.scheduleNumber,
        projectId: String(row.projectId),
        bookingId: String(row.bookingId),
        unitId: String(row.unitId),
        scheduleType: row.scheduleType,
        totalAmount: row.totalAmount,
        status: row.status,
        lines: (row.lines ?? []).map((line) => ({
          id: line._id ? String(line._id) : null,
          sequence: line.sequence,
          milestone: line.milestone,
          dueDate: line.dueDate
            ? new Date(line.dueDate).toISOString()
            : null,
          amount: line.amount,
          collectedAmount: line.collectedAmount,
          status: line.status,
        })),
      })),
      'Active payment schedules',
    );
  }

  async getAgreements(actor: AuthUser, customerId?: string) {
    const customer = await this.resolveCustomer(actor, customerId);
    const rows = await this.agreementModel
      .find({ ...NOT_DELETED, customerId: customer._id })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((row) => ({
        id: String(row._id),
        agreementNumber: row.agreementNumber,
        projectId: String(row.projectId),
        bookingId: String(row.bookingId),
        unitId: String(row.unitId),
        version: row.version,
        status: row.status,
        agreementValue: row.agreementValue,
        executedAt: row.executedAt
          ? new Date(row.executedAt).toISOString()
          : null,
        createdAt: row.createdAt
          ? new Date(row.createdAt).toISOString()
          : null,
      })),
      'Customer sale agreements',
    );
  }

  async getWarranties(actor: AuthUser, customerId?: string) {
    const customer = await this.resolveCustomer(actor, customerId);
    const rows = await this.warrantyModel
      .find({ ...NOT_DELETED, customerId: customer._id })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((row) => ({
        id: String(row._id),
        ticketNumber: row.ticketNumber,
        projectId: String(row.projectId),
        bookingId: String(row.bookingId),
        unitId: String(row.unitId),
        category: row.category,
        description: row.description,
        status: row.status,
        raisedAt: row.raisedAt
          ? new Date(row.raisedAt).toISOString()
          : null,
        closedAt: row.closedAt
          ? new Date(row.closedAt).toISOString()
          : null,
      })),
      'Customer warranty tickets',
    );
  }

  async raiseWarranty(
    actor: AuthUser,
    dto: RaiseCustomerWarrantyDto,
    customerId?: string,
  ) {
    const customer = await this.resolveCustomer(actor, customerId);
    const booking = await this.bookingModel
      .findOne({ _id: dto.bookingId, ...NOT_DELETED })
      .exec();
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (String(booking.customerId) !== String(customer._id)) {
      throw new ForbiddenException('Booking does not belong to this customer');
    }
    if (String(booking.unitId) !== dto.unitId) {
      throw new BadRequestException('Unit does not match booking');
    }

    const ticketNumber = await this.nextWarrantyNumber(String(booking.projectId));
    const created = await this.warrantyModel.create({
      ticketNumber,
      projectId: booking.projectId,
      bookingId: booking._id,
      customerId: customer._id,
      unitId: new Types.ObjectId(dto.unitId),
      handoverId: null,
      category: dto.category,
      description: dto.description.trim(),
      slaDueAt: null,
      status: WarrantyStatus.Complaint,
      assignedContractorId: null,
      assignedUserId: null,
      materialUsage: [],
      completionPhotos: [],
      inspectionNotes: null,
      rectificationNotes: null,
      verificationNotes: null,
      raisedAt: new Date(),
      closedAt: null,
      createdBy: new Types.ObjectId(actor.id),
    });

    return createSuccessResponse(
      {
        id: String(created._id),
        ticketNumber: created.ticketNumber,
        status: created.status,
        category: created.category,
        description: created.description,
      },
      'Warranty ticket raised',
    );
  }

  async getConstructionProgress(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const approvedDprCount = await this.dprModel
      .countDocuments({
        ...NOT_DELETED,
        projectId: new Types.ObjectId(projectId),
        status: {
          $in: [DprStatus.Approved, DprStatus.Reviewed, DprStatus.Locked],
        },
      })
      .exec();

    const payload: ConstructionProgressSummary = {
      projectId,
      approvedDprCount,
      message:
        'Construction progress summary is derived from approved daily progress reports.',
    };
    return createSuccessResponse(payload, 'Construction progress summary');
  }

  async getCustomerOverview(customerId: string) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customerId');
    }
    const customer = await this.customerModel
      .findOne({ _id: customerId, ...NOT_DELETED })
      .exec();
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const customerOid = customer._id as Types.ObjectId;
    const [bookingCount, activeSchedules, outstandingAgg, openWarranties] =
      await Promise.all([
        this.bookingModel
          .countDocuments({ ...NOT_DELETED, customerId: customerOid })
          .exec(),
        this.scheduleModel
          .countDocuments({
            ...NOT_DELETED,
            customerId: customerOid,
            status: PaymentScheduleStatus.Active,
          })
          .exec(),
        this.demandModel
          .aggregate<{ total: number }>([
            {
              $match: {
                ...NOT_DELETED,
                customerId: customerOid,
                status: PaymentDemandStatus.Issued,
                $expr: { $lt: ['$collectedAmount', '$totalAmount'] },
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: {
                    $subtract: ['$totalAmount', '$collectedAmount'],
                  },
                },
              },
            },
          ])
          .exec(),
        this.warrantyModel
          .countDocuments({
            ...NOT_DELETED,
            customerId: customerOid,
            status: {
              $nin: [WarrantyStatus.Closed, WarrantyStatus.Rejected],
            },
          })
          .exec(),
      ]);

    const overview: CustomerPortalOverview = {
      ...this.toProfile(customer as ResolvedCustomer),
      bookingCount,
      activeSchedules,
      outstandingDemands: this.round2(outstandingAgg[0]?.total ?? 0),
      openWarranties,
    };

    return createSuccessResponse(overview, 'Customer portal overview');
  }

  private async requireLinkedCustomer(actor: AuthUser): Promise<ResolvedCustomer> {
    const customer = await this.findCustomerByActor(actor);
    if (!customer) {
      throw new ForbiddenException(
        'No customer profile is linked to this user. Contact sales to link your account.',
      );
    }
    return customer;
  }

  private async resolveCustomer(
    actor: AuthUser,
    customerId?: string,
  ): Promise<ResolvedCustomer> {
    if (customerId) {
      if (!Types.ObjectId.isValid(customerId)) {
        throw new BadRequestException('Invalid customerId');
      }
      const customer = await this.customerModel
        .findOne({ _id: customerId, ...NOT_DELETED })
        .exec();
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
      return customer as ResolvedCustomer;
    }
    return this.requireLinkedCustomer(actor);
  }

  private async findCustomerByActor(
    actor: AuthUser,
  ): Promise<ResolvedCustomer | null> {
    const or: FilterQuery<Customer>[] = [];
    const email = actor.email?.trim().toLowerCase();
    const mobile = actor.mobile?.trim();
    if (email) {
      or.push({ 'contact.email': email });
      or.push({ 'additionalContacts.email': email });
    }
    if (mobile) {
      or.push({ 'contact.phone': mobile });
      or.push({ 'contact.alternatePhone': mobile });
      or.push({ 'additionalContacts.phone': mobile });
      or.push({ 'additionalContacts.alternatePhone': mobile });
    }
    if (!or.length) return null;

    const customer = await this.customerModel
      .findOne({
        ...NOT_DELETED,
        status: { $ne: CustomerStatus.Inactive },
        $or: or,
      })
      .exec();
    return customer ? (customer as ResolvedCustomer) : null;
  }

  private toProfile(customer: ResolvedCustomer): CustomerPortalProfile {
    return {
      customerId: String(customer._id),
      customerCode: customer.customerCode,
      fullName: customer.fullName,
      customerType: customer.customerType,
      status: customer.status,
      kycStatus: customer.kycStatus,
      contact: {
        email: customer.contact?.email ?? null,
        phone: customer.contact?.phone ?? null,
      },
    };
  }

  private async nextWarrantyNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.warrantyModel
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    return `WR-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
