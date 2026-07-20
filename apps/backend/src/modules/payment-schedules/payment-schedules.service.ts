import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalStatus } from '../approvals/schemas/approval-request.schema';
import {
  Booking,
  BookingStatus,
} from '../bookings/schemas/booking.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  toPublicPaymentDemand,
  toPublicPaymentSchedule,
} from './payment-schedules.mapper';
import {
  assertScheduleLines,
  canGenerateDemand,
  canMarkDue,
  isLineOverdue,
  roundMoney,
  roundPercent,
  startOfUtcDay,
  type ScheduleLineInput,
} from './payment-schedules.validation';
import type {
  ApprovePaymentScheduleDto,
  GenerateDemandDto,
  GeneratePaymentScheduleDto,
  ListPaymentSchedulesQueryDto,
  MarkDueDto,
  RejectPaymentScheduleDto,
  RevisePaymentScheduleDto,
} from './dto/payment-schedule.dto';
import {
  PaymentDemand,
  PaymentDemandStatus,
} from './schemas/payment-demand.schema';
import {
  PaymentSchedule,
  PaymentScheduleLine,
  PaymentScheduleLineStatus,
  PaymentScheduleStatus,
  PaymentScheduleType,
} from './schemas/payment-schedule.schema';

export const PAYMENT_SCHEDULE_APPROVAL_MODULE = 'sales';
export const PAYMENT_SCHEDULE_APPROVAL_ENTITY = 'payment_schedule';

const BOOKING_ELIGIBLE: BookingStatus[] = [
  BookingStatus.Booked,
  BookingStatus.Agreement,
  BookingStatus.Registered,
];

@Injectable()
export class PaymentSchedulesService {
  constructor(
    @InjectModel(PaymentSchedule.name)
    private readonly scheduleModel: Model<PaymentSchedule>,
    @InjectModel(PaymentDemand.name)
    private readonly demandModel: Model<PaymentDemand>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    private readonly numberingService: NumberingService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  async generate(dto: GeneratePaymentScheduleDto, actorId: string) {
    const booking = await this.requireEligibleBooking(dto.bookingId);
    await this.assertNoBlockingSchedule(String(booking._id));

    const linesInput = this.resolveLinesInput(dto, booking);
    const totalAmount = roundMoney(booking.approvedPrice);
    assertScheduleLines(dto.scheduleType, linesInput, totalAmount);

    const scheduleNumber = await this.numberingService.nextCode(
      NumberEntityType.PAYMENT_SCHEDULE,
      {
        projectId: String(booking.projectId),
        projectScoped: true,
      },
    );

    const lines = this.buildLines(linesInput);
    const row = await this.scheduleModel.create({
      scheduleNumber,
      bookingId: booking._id,
      projectId: booking.projectId,
      customerId: booking.customerId,
      unitId: booking.unitId,
      scheduleType: dto.scheduleType,
      totalAmount,
      lines,
      status: PaymentScheduleStatus.Draft,
      revisionNumber: 1,
      rootScheduleId: null,
      revisedFromId: null,
      remarks: dto.remarks?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    row.rootScheduleId = row._id as Types.ObjectId;
    await row.save();

    if (dto.submit) {
      return this.submitForApproval(String(row._id), actorId);
    }

    return createSuccessResponse(
      toPublicPaymentSchedule(row),
      'Payment schedule generated',
    );
  }

  async submitForApproval(id: string, actorId: string) {
    const row = await this.requireSchedule(id);
    if (
      row.status !== PaymentScheduleStatus.Draft &&
      row.status !== PaymentScheduleStatus.Rejected
    ) {
      throw new BadRequestException(
        'Only draft or rejected schedules can be submitted for approval',
      );
    }

    const approval = await this.approvalsService.create(
      String(row.projectId),
      {
        module: PAYMENT_SCHEDULE_APPROVAL_MODULE,
        entityType: PAYMENT_SCHEDULE_APPROVAL_ENTITY,
        entityId: String(row._id),
        amount: row.totalAmount,
        reason: `Payment schedule ${row.scheduleNumber} revision ${row.revisionNumber}`,
        submit: true,
      },
      actorId,
    );

    row.approvalRequestId = new Types.ObjectId(approval.data!.id);
    row.status = PaymentScheduleStatus.PendingApproval;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPaymentSchedule(row),
      'Payment schedule submitted for approval',
    );
  }

  async approve(
    id: string,
    dto: ApprovePaymentScheduleDto,
    actorId: string,
  ) {
    const row = await this.requireSchedule(id);
    if (row.status !== PaymentScheduleStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending_approval schedules can be approved',
      );
    }
    if (!row.approvalRequestId) {
      throw new BadRequestException('Approval request is missing');
    }

    const approval = await this.approvalsService.approve(
      String(row.projectId),
      String(row.approvalRequestId),
      actorId,
      { comment: dto.comment ?? 'Payment schedule approved' },
    );

    if (approval.data?.status === ApprovalStatus.Pending) {
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save();
      return createSuccessResponse(
        toPublicPaymentSchedule(row),
        'Payment schedule approval step completed',
      );
    }

    if (approval.data?.status !== ApprovalStatus.Approved) {
      throw new BadRequestException('Schedule approval was not completed');
    }

    if (row.revisedFromId) {
      await this.scheduleModel
        .updateOne(
          {
            _id: row.revisedFromId,
            status: PaymentScheduleStatus.Active,
          },
          {
            $set: {
              status: PaymentScheduleStatus.Superseded,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    } else {
      await this.scheduleModel
        .updateMany(
          {
            bookingId: row.bookingId,
            _id: { $ne: row._id },
            status: PaymentScheduleStatus.Active,
          },
          {
            $set: {
              status: PaymentScheduleStatus.Superseded,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    }

    row.status = PaymentScheduleStatus.Active;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPaymentSchedule(row),
      'Payment schedule approved and activated',
    );
  }

  async reject(id: string, dto: RejectPaymentScheduleDto, actorId: string) {
    const row = await this.requireSchedule(id);
    if (row.status !== PaymentScheduleStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending_approval schedules can be rejected',
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
    row.status = PaymentScheduleStatus.Rejected;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicPaymentSchedule(row),
      'Payment schedule rejected',
    );
  }

  /**
   * Create a new draft revision. Prior active schedule stays active until
   * the revision is approved (then it is superseded).
   */
  async revise(id: string, dto: RevisePaymentScheduleDto, actorId: string) {
    const previous = await this.requireSchedule(id);
    if (previous.status !== PaymentScheduleStatus.Active) {
      throw new BadRequestException(
        'Only active schedules can be revised (approval required)',
      );
    }

    const pendingRevision = await this.scheduleModel
      .findOne({
        revisedFromId: previous._id,
        status: {
          $in: [
            PaymentScheduleStatus.Draft,
            PaymentScheduleStatus.PendingApproval,
          ],
        },
      })
      .lean()
      .exec();
    if (pendingRevision) {
      throw new ConflictException(
        `Revision ${pendingRevision.scheduleNumber} is already in progress`,
      );
    }

    const scheduleType = dto.scheduleType ?? previous.scheduleType;
    const totalAmount = previous.totalAmount;
    assertScheduleLines(scheduleType, dto.lines, totalAmount);

    const scheduleNumber = await this.numberingService.nextCode(
      NumberEntityType.PAYMENT_SCHEDULE,
      {
        projectId: String(previous.projectId),
        projectScoped: true,
      },
    );

    const rootId = previous.rootScheduleId ?? (previous._id as Types.ObjectId);
    const row = await this.scheduleModel.create({
      scheduleNumber,
      bookingId: previous.bookingId,
      projectId: previous.projectId,
      customerId: previous.customerId,
      unitId: previous.unitId,
      scheduleType,
      totalAmount,
      lines: this.buildLines(dto.lines),
      status: PaymentScheduleStatus.Draft,
      revisionNumber: previous.revisionNumber + 1,
      rootScheduleId: rootId,
      revisedFromId: previous._id,
      remarks: dto.remarks?.trim() ?? previous.remarks,
      createdBy: new Types.ObjectId(actorId),
    });

    if (dto.submit !== false) {
      return this.submitForApproval(String(row._id), actorId);
    }

    return createSuccessResponse(
      toPublicPaymentSchedule(row),
      'Payment schedule revised (draft; approval required)',
    );
  }

  async getById(id: string) {
    const row = await this.requireSchedule(id);
    return createSuccessResponse(
      toPublicPaymentSchedule(row),
      'Payment schedule retrieved',
    );
  }

  async list(query: ListPaymentSchedulesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<PaymentSchedule> = {};

    if (query.status) filter.status = query.status;
    if (query.scheduleType) filter.scheduleType = query.scheduleType;
    if (query.bookingId) {
      filter.bookingId = new Types.ObjectId(query.bookingId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.search?.trim()) {
      filter.scheduleNumber = {
        $regex: query.search.trim(),
        $options: 'i',
      };
    }

    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const [items, total] = await Promise.all([
      this.scheduleModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.scheduleModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicPaymentSchedule(item)),
      'Payment schedules fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async markDue(id: string, dto: MarkDueDto, actorId: string) {
    const row = await this.requireActiveSchedule(id);
    const line = this.requireLine(row, dto.lineId);

    if (!canMarkDue(line.status)) {
      throw new BadRequestException(
        `Cannot mark line as due while status is ${line.status}`,
      );
    }

    if (dto.dueDate) {
      line.dueDate = this.parseDate(dto.dueDate, 'dueDate');
    }
    if (!line.dueDate) {
      throw new BadRequestException(
        'dueDate is required to mark a line as due',
      );
    }

    line.status = PaymentScheduleLineStatus.Due;
    line.markedDueAt = new Date();
    if (isLineOverdue({ status: line.status, dueDate: line.dueDate })) {
      line.status = PaymentScheduleLineStatus.Overdue;
      line.overdueAt = new Date();
    }

    row.markModified('lines');
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPaymentSchedule(row),
      'Schedule line marked due',
    );
  }

  async generateDemand(id: string, dto: GenerateDemandDto, actorId: string) {
    const row = await this.requireActiveSchedule(id);
    const line = this.requireLine(row, dto.lineId);

    if (line.demandId) {
      throw new ConflictException('Demand already generated for this line');
    }
    if (!canGenerateDemand(line.status)) {
      throw new BadRequestException(
        `Cannot generate demand while line status is ${line.status}`,
      );
    }

    const dueDate = dto.dueDate
      ? this.parseDate(dto.dueDate, 'dueDate')
      : line.dueDate;
    if (!dueDate) {
      throw new BadRequestException(
        'dueDate is required to generate a demand (set on line or request)',
      );
    }

    const demandNumber = await this.numberingService.nextCode(
      NumberEntityType.PAYMENT_DEMAND,
      {
        projectId: String(row.projectId),
        projectScoped: true,
      },
    );

    const tax = roundMoney(line.tax ?? 0);
    const amount = roundMoney(line.amount);
    const demand = await this.demandModel.create({
      demandNumber,
      scheduleId: row._id,
      lineId: line._id,
      bookingId: row.bookingId,
      projectId: row.projectId,
      customerId: row.customerId,
      milestone: line.milestone,
      dueDate,
      amount,
      tax,
      totalAmount: roundMoney(amount + tax),
      collectedAmount: 0,
      status: PaymentDemandStatus.Issued,
      issuedAt: new Date(),
      issuedBy: new Types.ObjectId(actorId),
      createdBy: new Types.ObjectId(actorId),
    });

    line.demandId = demand._id as Types.ObjectId;
    line.dueDate = dueDate;
    line.status = isLineOverdue({
      status: PaymentScheduleLineStatus.Demanded,
      dueDate,
    })
      ? PaymentScheduleLineStatus.Overdue
      : PaymentScheduleLineStatus.Demanded;
    if (line.status === PaymentScheduleLineStatus.Overdue && !line.overdueAt) {
      line.overdueAt = new Date();
    }

    row.markModified('lines');
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      {
        schedule: toPublicPaymentSchedule(row),
        demand: toPublicPaymentDemand(demand),
      },
      'Payment demand generated',
    );
  }

  /** Mark due/demanded/pending lines past dueDate as overdue. */
  async markOverdue() {
    const today = startOfUtcDay();
    const schedules = await this.scheduleModel
      .find({
        status: PaymentScheduleStatus.Active,
        'lines.status': {
          $in: [
            PaymentScheduleLineStatus.Pending,
            PaymentScheduleLineStatus.Due,
            PaymentScheduleLineStatus.Demanded,
          ],
        },
        'lines.dueDate': { $lt: today },
      })
      .exec();

    let marked = 0;
    for (const schedule of schedules) {
      let changed = false;
      for (const line of schedule.lines) {
        if (
          isLineOverdue({
            status: line.status,
            dueDate: line.dueDate,
            asOf: today,
          }) &&
          line.status !== PaymentScheduleLineStatus.Overdue
        ) {
          line.status = PaymentScheduleLineStatus.Overdue;
          line.overdueAt = new Date();
          changed = true;
          marked += 1;
        }
      }
      if (changed) {
        schedule.markModified('lines');
        await schedule.save();
      }
    }

    return createSuccessResponse(
      { marked, schedulesChecked: schedules.length },
      `Marked ${marked} schedule line(s) overdue`,
    );
  }

  async listOverdue(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const schedules = await this.scheduleModel
      .find({
        status: PaymentScheduleStatus.Active,
        'lines.status': PaymentScheduleLineStatus.Overdue,
      })
      .sort({ updatedAt: -1 })
      .exec();

    const overdueLines = schedules.flatMap((schedule) =>
      schedule.lines
        .filter((line) => line.status === PaymentScheduleLineStatus.Overdue)
        .map((line) => ({
          scheduleId: String(schedule._id),
          scheduleNumber: schedule.scheduleNumber,
          bookingId: String(schedule.bookingId),
          customerId: String(schedule.customerId),
          projectId: String(schedule.projectId),
          line: {
            id: String(line._id),
            sequence: line.sequence,
            milestone: line.milestone,
            dueDate: line.dueDate,
            percentage: line.percentage,
            amount: line.amount,
            tax: line.tax,
            status: line.status,
            overdueAt: line.overdueAt,
            demandId: line.demandId ? String(line.demandId) : null,
          },
        })),
    );

    const total = overdueLines.length;
    const slice = overdueLines.slice((page - 1) * limit, page * limit);

    return createSuccessResponse(
      slice,
      'Overdue schedule lines fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private resolveLinesInput(
    dto: GeneratePaymentScheduleDto,
    booking: Booking,
  ): ScheduleLineInput[] {
    if (dto.lines?.length) {
      return dto.lines;
    }

    const installments = booking.paymentPlan?.installments ?? [];
    if (!installments.length) {
      throw new BadRequestException(
        'lines are required when booking has no paymentPlan installments',
      );
    }

    if (
      dto.scheduleType !== PaymentScheduleType.DateBased &&
      dto.scheduleType !== PaymentScheduleType.Custom
    ) {
      throw new BadRequestException(
        `lines are required for scheduleType ${dto.scheduleType}`,
      );
    }

    const total = roundMoney(booking.approvedPrice);
    return installments.map((item, index) => {
      const amount = roundMoney(item.amount);
      const percentage =
        item.percent != null
          ? roundPercent(item.percent)
          : total > 0
            ? roundPercent((amount / total) * 100)
            : 0;
      return {
        sequence: item.sequence ?? index + 1,
        milestone: item.label,
        dueDate: item.dueDate ?? null,
        percentage,
        amount,
        tax: 0,
      };
    });
  }

  private buildLines(inputs: ScheduleLineInput[]): PaymentScheduleLine[] {
    return inputs.map((line) => ({
      _id: new Types.ObjectId(),
      sequence: line.sequence,
      milestone: line.milestone.trim(),
      dueDate: line.dueDate
        ? this.parseDate(String(line.dueDate), 'dueDate')
        : null,
      percentage: roundPercent(line.percentage),
      amount: roundMoney(line.amount),
      tax: roundMoney(line.tax ?? 0),
      collectedAmount: 0,
      status: PaymentScheduleLineStatus.Pending,
      demandId: null,
      markedDueAt: null,
      overdueAt: null,
    })) as PaymentScheduleLine[];
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private requireLine(row: PaymentSchedule, lineId: string) {
    if (!Types.ObjectId.isValid(lineId)) {
      throw new BadRequestException('Invalid lineId');
    }
    const line = row.lines.find((l) => String(l._id) === lineId);
    if (!line) {
      throw new NotFoundException('Schedule line not found');
    }
    return line;
  }

  private async requireActiveSchedule(id: string) {
    const row = await this.requireSchedule(id);
    if (row.status !== PaymentScheduleStatus.Active) {
      throw new BadRequestException(
        'Demands and due marking require an active schedule',
      );
    }
    return row;
  }

  private async requireSchedule(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Payment schedule not found');
    }
    const row = await this.scheduleModel.findById(id).exec();
    if (!row) throw new NotFoundException('Payment schedule not found');
    return row;
  }

  private async requireEligibleBooking(bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid bookingId');
    }
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) throw new NotFoundException('Booking not found');
    if (!BOOKING_ELIGIBLE.includes(booking.status)) {
      throw new BadRequestException(
        `Booking must be booked, agreement, or registered (current: ${booking.status})`,
      );
    }
    return booking;
  }

  private async assertNoBlockingSchedule(bookingId: string) {
    const existing = await this.scheduleModel
      .findOne({
        bookingId: new Types.ObjectId(bookingId),
        status: {
          $in: [
            PaymentScheduleStatus.Draft,
            PaymentScheduleStatus.PendingApproval,
            PaymentScheduleStatus.Active,
          ],
        },
      })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(
        `Booking already has a ${existing.status} payment schedule (${existing.scheduleNumber})`,
      );
    }
  }
}
