import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { Booking, BookingStatus } from '../bookings/schemas/booking.schema';
import { toPublicSaleAgreement } from './sale-agreements.mapper';
import type {
  AgreementMilestoneDto,
  CreateSaleAgreementDto,
  ListSaleAgreementsQueryDto,
  RejectSaleAgreementDto,
  ReviseSaleAgreementDto,
  StampPaperDto,
  UpdateSaleAgreementDto,
} from './dto/sale-agreement.dto';
import {
  AgreementMilestone,
  SaleAgreement,
  SaleAgreementStatus,
  StampPaper,
} from './schemas/sale-agreement.schema';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class SaleAgreementsService {
  constructor(
    @InjectModel(SaleAgreement.name)
    private readonly model: Model<SaleAgreement>,
    @Optional()
    @InjectModel(Booking.name)
    private readonly bookingModel?: Model<Booking>,
  ) {}

  async create(dto: CreateSaleAgreementDto, actorId: string) {
    if (!Number.isFinite(dto.agreementValue) || dto.agreementValue < 0) {
      throw new BadRequestException('agreementValue must be ≥ 0');
    }

    const agreementNumber = await this.nextNumber(dto.projectId);
    const row = await this.model.create({
      agreementNumber,
      companyId: new Types.ObjectId(dto.companyId),
      projectId: new Types.ObjectId(dto.projectId),
      bookingId: new Types.ObjectId(dto.bookingId),
      customerId: new Types.ObjectId(dto.customerId),
      unitId: new Types.ObjectId(dto.unitId),
      version: 1,
      rootAgreementId: null,
      revisedFromId: null,
      status: SaleAgreementStatus.Draft,
      agreementValue: roundMoney(dto.agreementValue),
      stampPaper: this.mapStampPaper(dto.stampPaper),
      paymentScheduleSnapshot: this.mapPaymentSchedule(
        dto.paymentScheduleSnapshot,
      ),
      milestones: this.mapMilestones(dto.milestones),
      clauses: dto.clauses ?? [],
      attachments: dto.attachments ?? [],
      requestedBy: null,
      requestedAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      approvalRequestId: null,
      executedAt: null,
      cancelledAt: null,
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    row.rootAgreementId = row._id as Types.ObjectId;
    await row.save();

    return createSuccessResponse(
      toPublicSaleAgreement(row),
      'Sale agreement created',
    );
  }

  async update(id: string, dto: UpdateSaleAgreementDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== SaleAgreementStatus.Draft) {
      throw new BadRequestException('Only draft agreements can be updated');
    }

    if (dto.agreementValue !== undefined) {
      row.agreementValue = roundMoney(dto.agreementValue);
    }
    if (dto.stampPaper !== undefined) {
      row.stampPaper = this.mapStampPaper(dto.stampPaper);
    }
    if (dto.paymentScheduleSnapshot !== undefined) {
      row.paymentScheduleSnapshot = this.mapPaymentSchedule(
        dto.paymentScheduleSnapshot,
      );
    }
    if (dto.milestones !== undefined) {
      row.milestones = this.mapMilestones(dto.milestones);
    }
    if (dto.clauses !== undefined) {
      row.clauses = dto.clauses;
    }
    if (dto.attachments !== undefined) {
      row.attachments = dto.attachments;
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() ?? null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSaleAgreement(row),
      'Sale agreement updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== SaleAgreementStatus.Draft) {
      throw new BadRequestException('Only draft agreements can be submitted');
    }
    row.status = SaleAgreementStatus.PendingApproval;
    row.requestedBy = new Types.ObjectId(actorId);
    row.requestedAt = new Date();
    row.rejectedBy = null;
    row.rejectedAt = null;
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSaleAgreement(row),
      'Sale agreement submitted for approval',
    );
  }

  async approve(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== SaleAgreementStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending_approval agreements can be approved',
      );
    }
    row.status = SaleAgreementStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSaleAgreement(row),
      'Sale agreement approved',
    );
  }

  async reject(id: string, dto: RejectSaleAgreementDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== SaleAgreementStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending_approval agreements can be rejected',
      );
    }
    row.status = SaleAgreementStatus.Draft;
    row.rejectedBy = new Types.ObjectId(actorId);
    row.rejectedAt = new Date();
    row.rejectionReason = dto.reason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSaleAgreement(row),
      'Sale agreement rejected',
    );
  }

  async execute(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== SaleAgreementStatus.Approved) {
      throw new BadRequestException(
        'Only approved agreements can be executed',
      );
    }
    row.status = SaleAgreementStatus.Executed;
    row.executedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    await this.tryUpdateBookingToAgreement(row.bookingId);

    return createSuccessResponse(
      toPublicSaleAgreement(row),
      'Sale agreement executed',
    );
  }

  async revise(id: string, dto: ReviseSaleAgreementDto, actorId: string) {
    const source = await this.requireRow(id);
    if (
      source.status !== SaleAgreementStatus.Approved &&
      source.status !== SaleAgreementStatus.Executed
    ) {
      throw new BadRequestException(
        'Only approved or executed agreements can be revised',
      );
    }

    source.status = SaleAgreementStatus.Superseded;
    source.set('updatedBy', new Types.ObjectId(actorId));
    await source.save();

    const agreementNumber = await this.nextNumber(String(source.projectId));
    const row = await this.model.create({
      agreementNumber,
      companyId: source.companyId,
      projectId: source.projectId,
      bookingId: source.bookingId,
      customerId: source.customerId,
      unitId: source.unitId,
      version: source.version + 1,
      rootAgreementId: source.rootAgreementId ?? (source._id as Types.ObjectId),
      revisedFromId: source._id as Types.ObjectId,
      status: SaleAgreementStatus.Draft,
      agreementValue: roundMoney(
        dto.agreementValue ?? source.agreementValue,
      ),
      stampPaper: this.mapStampPaper(dto.stampPaper ?? source.stampPaper),
      paymentScheduleSnapshot: this.mapPaymentSchedule(
        dto.paymentScheduleSnapshot ??
          source.paymentScheduleSnapshot.map((line) => ({
            sequence: line.sequence,
            label: line.label,
            dueDate: line.dueDate?.toISOString() ?? null,
            amount: line.amount,
            percent: line.percent,
          })),
      ),
      milestones: dto.milestones
        ? this.mapMilestones(dto.milestones)
        : source.milestones,
      clauses: dto.clauses ?? source.clauses,
      attachments: dto.attachments ?? source.attachments,
      requestedBy: null,
      requestedAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      approvalRequestId: null,
      executedAt: null,
      cancelledAt: null,
      notes: dto.notes?.trim() ?? source.notes,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicSaleAgreement(row),
      'Sale agreement revision created',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (
      row.status !== SaleAgreementStatus.Draft &&
      row.status !== SaleAgreementStatus.PendingApproval &&
      row.status !== SaleAgreementStatus.Approved
    ) {
      throw new BadRequestException(
        'Only draft, pending_approval, or approved agreements can be cancelled',
      );
    }
    row.status = SaleAgreementStatus.Cancelled;
    row.cancelledAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSaleAgreement(row),
      'Sale agreement cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicSaleAgreement(row),
      'Sale agreement fetched',
    );
  }

  async list(query: ListSaleAgreementsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<SaleAgreement> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.bookingId) {
      filter.bookingId = new Types.ObjectId(query.bookingId);
    }
    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.unitId) filter.unitId = new Types.ObjectId(query.unitId);
    if (query.rootAgreementId) {
      filter.rootAgreementId = new Types.ObjectId(query.rootAgreementId);
    }
    if (query.status) filter.status = query.status;

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicSaleAgreement(row)),
      'Sale agreements fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private mapStampPaper(input?: StampPaperDto | StampPaper | null) {
    if (!input) {
      return {
        series: null,
        number: null,
        purchasedOn: null,
        amount: null,
      };
    }
    const purchasedOn =
      input.purchasedOn == null
        ? null
        : input.purchasedOn instanceof Date
          ? input.purchasedOn
          : new Date(input.purchasedOn);
    return {
      series: input.series?.trim() ?? null,
      number: input.number?.trim() ?? null,
      purchasedOn,
      amount:
        input.amount != null && Number.isFinite(input.amount)
          ? roundMoney(input.amount)
          : null,
    };
  }

  private mapMilestones(
    milestones?: AgreementMilestoneDto[] | AgreementMilestone[],
  ) {
    return (milestones ?? []).map((milestone) => ({
      code: milestone.code.trim(),
      label: milestone.label.trim(),
      percent: milestone.percent ?? null,
      amount:
        milestone.amount != null && Number.isFinite(milestone.amount)
          ? roundMoney(milestone.amount)
          : null,
    }));
  }

  private mapPaymentSchedule(
    lines?: {
      sequence: number;
      label: string;
      dueDate?: string | null;
      amount: number;
      percent?: number | null;
    }[],
  ) {
    return (lines ?? []).map((line) => ({
      sequence: line.sequence,
      label: line.label.trim(),
      dueDate: line.dueDate ? new Date(line.dueDate) : null,
      amount: roundMoney(line.amount),
      percent: line.percent ?? null,
    }));
  }

  private async tryUpdateBookingToAgreement(bookingId: Types.ObjectId) {
    if (!this.bookingModel || !BookingStatus?.Agreement) return;
    try {
      await this.bookingModel
        .findByIdAndUpdate(bookingId, { status: BookingStatus.Agreement })
        .exec();
    } catch {
      // Soft integration — booking module may be absent or status unavailable.
    }
  }

  private async nextNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.model
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `SAG-${year}-${seq}`;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid sale agreement id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Sale agreement not found');
    return row;
  }
}
