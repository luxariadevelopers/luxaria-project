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
import { SiteAccessService } from '../sites/site-access.service';
import type {
  CancelWorkOrderDto,
  CreateWorkOrderAmendmentDto,
  CreateWorkOrderDto,
  ListWorkOrderAmendmentsQueryDto,
  ListWorkOrdersQueryDto,
  RejectWorkOrderAmendmentDto,
  UpdateWorkOrderDto,
  WorkOrderBoqLineDto,
  WorkOrderMilestoneDto,
  WorkOrderPaymentTermsDto,
  WorkOrderRecoveryDto,
  WorkOrderRetentionDto,
} from './dto/work-order.dto';
import {
  WorkOrderAmendment,
  WorkOrderAmendmentStatus,
} from './schemas/work-order-amendment.schema';
import {
  WorkOrder,
  WorkOrderResponsibility,
  WorkOrderStatus,
  type WorkOrderBoqLine,
  type WorkOrderCommercialRevision,
  type WorkOrderMilestone,
  type WorkOrderPaymentTerms,
  type WorkOrderRecovery,
  type WorkOrderRetention,
} from './schemas/work-order.schema';
import {
  toPublicWorkOrder,
  toPublicWorkOrderAmendment,
} from './work-orders.mapper';

const AMENDABLE: WorkOrderStatus[] = [
  WorkOrderStatus.Approved,
  WorkOrderStatus.Issued,
  WorkOrderStatus.Accepted,
  WorkOrderStatus.InProgress,
  WorkOrderStatus.PartiallyCompleted,
];

const OPEN_AMENDMENT: WorkOrderAmendmentStatus[] = [
  WorkOrderAmendmentStatus.Draft,
  WorkOrderAmendmentStatus.PendingApproval,
];

@Injectable()
export class WorkOrdersService {
  constructor(
    @InjectModel(WorkOrder.name)
    private readonly workOrderModel: Model<WorkOrder>,
    @InjectModel(WorkOrderAmendment.name)
    private readonly amendmentModel: Model<WorkOrderAmendment>,
    private readonly siteAccessService: SiteAccessService,
  ) {}

  async create(dto: CreateWorkOrderDto, actorId: string) {
    await this.assertSiteAccess(actorId, dto.projectId, dto.siteId);

    const startDate = this.parseDate(dto.startDate, 'startDate');
    const endDate = this.parseDate(dto.endDate, 'endDate');
    this.assertDateRange(startDate, endDate);

    const boqScopeLines = this.buildBoqLines(dto.boqScopeLines);
    const contractValue = this.sumValues(boqScopeLines);
    const workOrderNumber = await this.nextWorkOrderNumber(dto.projectId);

    const row = await this.workOrderModel.create({
      workOrderNumber,
      activeRevision: 0,
      projectId: new Types.ObjectId(dto.projectId),
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      contractorId: new Types.ObjectId(dto.contractorId),
      rateContractId: dto.rateContractId
        ? new Types.ObjectId(dto.rateContractId)
        : null,
      agreementId: dto.agreementId
        ? new Types.ObjectId(dto.agreementId)
        : null,
      boqScopeLines,
      locations: (dto.locations ?? []).map((l) => l.trim()).filter(Boolean),
      startDate,
      endDate,
      milestones: this.buildMilestones(dto.milestones),
      paymentTerms: this.buildPaymentTerms(dto.paymentTerms),
      retention: this.buildRetention(dto.retention),
      recoveries: this.buildRecoveries(dto.recoveries),
      materialResponsibility:
        dto.materialResponsibility ?? WorkOrderResponsibility.Company,
      labourResponsibility:
        dto.labourResponsibility ?? WorkOrderResponsibility.Contractor,
      drawingIds: (dto.drawingIds ?? []).map((id) => new Types.ObjectId(id)),
      terms: dto.terms?.trim() || null,
      attachments: dto.attachments ?? [],
      contractValue,
      revisions: [],
      status: WorkOrderStatus.Draft,
      createdBy: new Types.ObjectId(actorId),
      notes: dto.notes?.trim() || null,
    });

    return createSuccessResponse(
      toPublicWorkOrder(row),
      'Work order created as draft',
    );
  }

  async update(id: string, dto: UpdateWorkOrderDto, actorId: string) {
    const row = await this.requireWorkOrder(id);
    if (row.status !== WorkOrderStatus.Draft) {
      throw new BadRequestException(
        'Only draft work orders can be edited directly; use createAmendment for approved commercial changes',
      );
    }

    if (dto.siteId !== undefined) {
      await this.assertSiteAccess(
        actorId,
        String(row.projectId),
        dto.siteId,
      );
      row.siteId = dto.siteId ? new Types.ObjectId(dto.siteId) : null;
    }

    if (dto.rateContractId !== undefined) {
      row.rateContractId = dto.rateContractId
        ? new Types.ObjectId(dto.rateContractId)
        : null;
    }
    if (dto.agreementId !== undefined) {
      row.agreementId = dto.agreementId
        ? new Types.ObjectId(dto.agreementId)
        : null;
    }
    if (dto.boqScopeLines !== undefined) {
      row.boqScopeLines = this.buildBoqLines(dto.boqScopeLines);
      row.contractValue = this.sumValues(row.boqScopeLines);
    }
    if (dto.locations !== undefined) {
      row.locations = dto.locations.map((l) => l.trim()).filter(Boolean);
    }
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const startDate = dto.startDate
        ? this.parseDate(dto.startDate, 'startDate')
        : row.startDate;
      const endDate = dto.endDate
        ? this.parseDate(dto.endDate, 'endDate')
        : row.endDate;
      this.assertDateRange(startDate, endDate);
      row.startDate = startDate;
      row.endDate = endDate;
    }
    if (dto.milestones !== undefined) {
      row.milestones = this.buildMilestones(dto.milestones);
    }
    if (dto.paymentTerms !== undefined) {
      row.paymentTerms = this.buildPaymentTerms(dto.paymentTerms);
    }
    if (dto.retention !== undefined) {
      row.retention = this.buildRetention(dto.retention);
    }
    if (dto.recoveries !== undefined) {
      row.recoveries = this.buildRecoveries(dto.recoveries);
    }
    if (dto.materialResponsibility !== undefined) {
      row.materialResponsibility = dto.materialResponsibility;
    }
    if (dto.labourResponsibility !== undefined) {
      row.labourResponsibility = dto.labourResponsibility;
    }
    if (dto.drawingIds !== undefined) {
      row.drawingIds = dto.drawingIds.map((docId) => new Types.ObjectId(docId));
    }
    if (dto.terms !== undefined) row.terms = dto.terms?.trim() || null;
    if (dto.attachments !== undefined) row.attachments = dto.attachments;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicWorkOrder(row), 'Work order updated');
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireWorkOrder(id);
    if (row.status !== WorkOrderStatus.Draft) {
      throw new BadRequestException(
        'Only draft work orders can be submitted for approval',
      );
    }
    if (!row.boqScopeLines?.length) {
      throw new BadRequestException('At least one BOQ scope line is required');
    }
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );

    row.status = WorkOrderStatus.PendingApproval;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicWorkOrder(row),
      'Work order submitted for approval',
    );
  }

  async approve(id: string, actorId: string) {
    const row = await this.requireWorkOrder(id);
    if (row.status !== WorkOrderStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending-approval work orders can be approved',
      );
    }
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );

    const frozenAt = new Date();
    const revision = this.buildFrozenRevision({
      revision: 1,
      amendmentId: null,
      row,
      actorId,
      frozenAt,
    });

    // Append-only: never mutate prior revisions (none yet for first approve).
    row.revisions = [...(row.revisions ?? []), revision];
    row.activeRevision = 1;
    row.status = WorkOrderStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = frozenAt;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicWorkOrder(row),
      'Work order approved; commercial revision 1 frozen',
    );
  }

  async issue(id: string, actorId: string) {
    return this.transition(
      id,
      actorId,
      WorkOrderStatus.Approved,
      WorkOrderStatus.Issued,
      (row) => {
        row.issuedBy = new Types.ObjectId(actorId);
        row.issuedAt = new Date();
      },
      'Work order issued',
    );
  }

  async accept(id: string, actorId: string) {
    return this.transition(
      id,
      actorId,
      WorkOrderStatus.Issued,
      WorkOrderStatus.Accepted,
      (row) => {
        row.acceptedBy = new Types.ObjectId(actorId);
        row.acceptedAt = new Date();
      },
      'Work order accepted',
    );
  }

  async startProgress(id: string, actorId: string) {
    return this.transition(
      id,
      actorId,
      WorkOrderStatus.Accepted,
      WorkOrderStatus.InProgress,
      undefined,
      'Work order in progress',
    );
  }

  async markPartiallyCompleted(id: string, actorId: string) {
    return this.transition(
      id,
      actorId,
      WorkOrderStatus.InProgress,
      WorkOrderStatus.PartiallyCompleted,
      undefined,
      'Work order marked partially completed',
    );
  }

  async complete(id: string, actorId: string) {
    const row = await this.requireWorkOrder(id);
    if (
      row.status !== WorkOrderStatus.InProgress &&
      row.status !== WorkOrderStatus.PartiallyCompleted
    ) {
      throw new BadRequestException(
        'Only in-progress or partially-completed work orders can be completed',
      );
    }
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );

    row.status = WorkOrderStatus.Completed;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicWorkOrder(row),
      'Work order completed',
    );
  }

  async close(id: string, actorId: string) {
    return this.transition(
      id,
      actorId,
      WorkOrderStatus.Completed,
      WorkOrderStatus.Closed,
      (row) => {
        row.closedBy = new Types.ObjectId(actorId);
        row.closedAt = new Date();
      },
      'Work order closed',
    );
  }

  async cancel(id: string, dto: CancelWorkOrderDto, actorId: string) {
    const row = await this.requireWorkOrder(id);
    const cancellable: WorkOrderStatus[] = [
      WorkOrderStatus.Draft,
      WorkOrderStatus.PendingApproval,
      WorkOrderStatus.Approved,
      WorkOrderStatus.Issued,
    ];
    if (!cancellable.includes(row.status)) {
      throw new BadRequestException(
        'Work order cannot be cancelled in its current status',
      );
    }
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );

    row.status = WorkOrderStatus.Cancelled;
    row.cancelledBy = new Types.ObjectId(actorId);
    row.cancelledAt = new Date();
    row.cancellationReason = dto.reason?.trim() || null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicWorkOrder(row),
      'Work order cancelled',
    );
  }

  /**
   * Create a draft amendment against an approved commercial snapshot.
   * Does NOT mutate the active WO commercial fields.
   */
  async createAmendment(
    workOrderId: string,
    dto: CreateWorkOrderAmendmentDto,
    actorId: string,
  ) {
    const wo = await this.requireWorkOrder(workOrderId);
    if (!AMENDABLE.includes(wo.status)) {
      throw new BadRequestException(
        'Amendments require an approved (active) work order; edit the draft instead',
      );
    }
    if (wo.activeRevision < 1 || !wo.revisions?.length) {
      throw new BadRequestException(
        'Work order has no frozen commercial revision to amend',
      );
    }
    await this.assertSiteAccess(
      actorId,
      String(wo.projectId),
      wo.siteId ? String(wo.siteId) : null,
    );

    const open = await this.amendmentModel
      .findOne({
        workOrderId: wo._id,
        status: { $in: OPEN_AMENDMENT },
      })
      .exec();
    if (open) {
      throw new ConflictException(
        'A draft or pending amendment already exists for this work order',
      );
    }

    const proposed = this.buildProposedFromDto(wo, dto);
    const targetRevision = wo.activeRevision + 1;
    const amendmentNumber = await this.nextAmendmentNumber(
      String(wo.projectId),
      wo.workOrderNumber,
    );

    const amendment = await this.amendmentModel.create({
      amendmentNumber,
      workOrderId: wo._id,
      projectId: wo.projectId,
      targetRevision,
      type: dto.type,
      status: WorkOrderAmendmentStatus.Draft,
      reason: dto.reason.trim(),
      proposed,
      baseRevision: wo.activeRevision,
      createdBy: new Types.ObjectId(actorId),
    });

    // Auto-submit for approval (single-step commercial change request).
    amendment.status = WorkOrderAmendmentStatus.PendingApproval;
    amendment.submittedBy = new Types.ObjectId(actorId);
    amendment.submittedAt = new Date();
    await amendment.save();

    return createSuccessResponse(
      toPublicWorkOrderAmendment(amendment),
      'Work order amendment created (pending approval; commercial snapshot unchanged)',
    );
  }

  /**
   * Approve amendment: append a new frozen revision and update active commercial
   * fields from the proposed payload. Prior revision entries are never mutated.
   */
  async approveAmendment(amendmentId: string, actorId: string) {
    const amendment = await this.requireAmendment(amendmentId);
    if (amendment.status !== WorkOrderAmendmentStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending-approval amendments can be approved',
      );
    }

    const wo = await this.requireWorkOrder(String(amendment.workOrderId));
    if (!AMENDABLE.includes(wo.status)) {
      throw new BadRequestException(
        'Work order is not in an amendable status',
      );
    }
    if (wo.activeRevision !== amendment.baseRevision) {
      throw new ConflictException(
        'Work order commercial revision changed since this amendment was created',
      );
    }
    await this.assertSiteAccess(
      actorId,
      String(wo.projectId),
      wo.siteId ? String(wo.siteId) : null,
    );

    // Immutability guard: existing frozen revisions must remain byte-stable.
    const priorRevisionsSnapshot = JSON.stringify(
      (wo.revisions ?? []).map((r) => ({
        revision: r.revision,
        contractValue: r.contractValue,
        startDate: r.startDate,
        endDate: r.endDate,
        amendmentId: r.amendmentId ? String(r.amendmentId) : null,
        boqScopeLines: r.boqScopeLines,
      })),
    );

    const frozenAt = new Date();
    const newRevision = this.buildFrozenRevisionFromProposed({
      revision: amendment.targetRevision,
      amendmentId: amendment._id,
      proposed: amendment.proposed,
      actorId,
      frozenAt,
    });

    const priorCount = wo.revisions?.length ?? 0;
    wo.revisions = [...(wo.revisions ?? []), newRevision];
    wo.activeRevision = amendment.targetRevision;

    // Apply proposed → active commercial (new snapshot only; history preserved).
    wo.boqScopeLines = amendment.proposed.boqScopeLines.map((l) => ({
      boqItemId: l.boqItemId,
      boqCode: l.boqCode,
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      rate: l.rate,
      value: l.value,
    }));
    wo.locations = [...(amendment.proposed.locations ?? [])];
    wo.startDate = amendment.proposed.startDate;
    wo.endDate = amendment.proposed.endDate;
    wo.milestones = (amendment.proposed.milestones ?? []).map((m) => ({
      name: m.name,
      dueDate: m.dueDate,
      percentComplete: m.percentComplete,
      notes: m.notes,
    }));
    wo.paymentTerms = {
      description: amendment.proposed.paymentTerms?.description ?? null,
      advancePercent: amendment.proposed.paymentTerms?.advancePercent ?? null,
      billingCycle: amendment.proposed.paymentTerms?.billingCycle ?? null,
    };
    wo.retention = {
      percentage: amendment.proposed.retention?.percentage ?? 0,
      notes: amendment.proposed.retention?.notes ?? null,
    };
    wo.recoveries = (amendment.proposed.recoveries ?? []).map((r) => ({
      type: r.type,
      amount: r.amount,
      notes: r.notes,
    }));
    wo.materialResponsibility = amendment.proposed.materialResponsibility;
    wo.labourResponsibility = amendment.proposed.labourResponsibility;
    wo.drawingIds = [...(amendment.proposed.drawingIds ?? [])];
    wo.terms = amendment.proposed.terms ?? null;
    wo.attachments = [...(amendment.proposed.attachments ?? [])];
    wo.contractValue = amendment.proposed.contractValue;

    // Verify prior revisions were not mutated before save.
    const priorAfter = JSON.stringify(
      (wo.revisions ?? []).slice(0, priorCount).map((r) => ({
        revision: r.revision,
        contractValue: r.contractValue,
        startDate: r.startDate,
        endDate: r.endDate,
        amendmentId: r.amendmentId ? String(r.amendmentId) : null,
        boqScopeLines: r.boqScopeLines,
      })),
    );
    if (priorAfter !== priorRevisionsSnapshot) {
      throw new ConflictException(
        'Refusing to save: approved commercial revision history would be overwritten',
      );
    }

    rowSetUpdatedBy(wo, actorId);
    await wo.save();

    amendment.status = WorkOrderAmendmentStatus.Approved;
    amendment.approvedBy = new Types.ObjectId(actorId);
    amendment.approvedAt = frozenAt;
    amendment.set('updatedBy', new Types.ObjectId(actorId));
    await amendment.save();

    return createSuccessResponse(
      {
        workOrder: toPublicWorkOrder(wo),
        amendment: toPublicWorkOrderAmendment(amendment),
      },
      `Amendment approved; commercial revision ${amendment.targetRevision} frozen`,
    );
  }

  async rejectAmendment(
    amendmentId: string,
    dto: RejectWorkOrderAmendmentDto,
    actorId: string,
  ) {
    const amendment = await this.requireAmendment(amendmentId);
    if (amendment.status !== WorkOrderAmendmentStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending-approval amendments can be rejected',
      );
    }
    const wo = await this.requireWorkOrder(String(amendment.workOrderId));
    await this.assertSiteAccess(
      actorId,
      String(wo.projectId),
      wo.siteId ? String(wo.siteId) : null,
    );

    amendment.status = WorkOrderAmendmentStatus.Rejected;
    amendment.rejectedBy = new Types.ObjectId(actorId);
    amendment.rejectedAt = new Date();
    amendment.rejectionReason = dto.reason?.trim() || null;
    amendment.set('updatedBy', new Types.ObjectId(actorId));
    await amendment.save();

    return createSuccessResponse(
      toPublicWorkOrderAmendment(amendment),
      'Work order amendment rejected (commercial snapshot unchanged)',
    );
  }

  async getById(id: string) {
    const row = await this.requireWorkOrder(id);
    return createSuccessResponse(toPublicWorkOrder(row), 'Work order fetched');
  }

  async list(query: ListWorkOrdersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<WorkOrder> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) filter.siteId = new Types.ObjectId(query.siteId);
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.status) filter.status = query.status;

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.workOrderModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.workOrderModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicWorkOrder(row)),
      'Work orders fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async listAmendments(
    workOrderId: string,
    query: ListWorkOrderAmendmentsQueryDto,
  ) {
    await this.requireWorkOrder(workOrderId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<WorkOrderAmendment> = {
      workOrderId: new Types.ObjectId(workOrderId),
    };
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      this.amendmentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.amendmentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicWorkOrderAmendment(row)),
      'Work order amendments fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getAmendment(amendmentId: string) {
    const amendment = await this.requireAmendment(amendmentId);
    return createSuccessResponse(
      toPublicWorkOrderAmendment(amendment),
      'Work order amendment fetched',
    );
  }

  // ── helpers ──────────────────────────────────────────────────────────

  private async transition(
    id: string,
    actorId: string,
    from: WorkOrderStatus,
    to: WorkOrderStatus,
    mutate: ((row: WorkOrder & { set: (k: string, v: unknown) => void }) => void) | undefined,
    message: string,
  ) {
    const row = await this.requireWorkOrder(id);
    if (row.status !== from) {
      throw new BadRequestException(
        `Work order must be ${from} to transition to ${to}`,
      );
    }
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );

    row.status = to;
    mutate?.(row as WorkOrder & { set: (k: string, v: unknown) => void });
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicWorkOrder(row), message);
  }

  private buildBoqLines(lines: WorkOrderBoqLineDto[]): WorkOrderBoqLine[] {
    return lines.map((line) => {
      const quantity = line.quantity;
      const rate = line.rate;
      return {
        boqItemId: line.boqItemId
          ? new Types.ObjectId(line.boqItemId)
          : null,
        boqCode: line.boqCode?.trim() || null,
        description: line.description.trim(),
        unit: line.unit,
        quantity,
        rate,
        value: quantity * rate,
      };
    });
  }

  private sumValues(lines: WorkOrderBoqLine[]): number {
    return lines.reduce((sum, l) => sum + (l.value ?? 0), 0);
  }

  private buildMilestones(
    milestones?: WorkOrderMilestoneDto[],
  ): WorkOrderMilestone[] {
    return (milestones ?? []).map((m) => ({
      name: m.name.trim(),
      dueDate: m.dueDate ? this.parseDate(m.dueDate, 'dueDate') : null,
      percentComplete: m.percentComplete ?? null,
      notes: m.notes?.trim() || null,
    }));
  }

  private buildPaymentTerms(
    terms?: WorkOrderPaymentTermsDto,
  ): WorkOrderPaymentTerms {
    return {
      description: terms?.description?.trim() || null,
      advancePercent: terms?.advancePercent ?? null,
      billingCycle: terms?.billingCycle?.trim() || null,
    };
  }

  private buildRetention(ret?: WorkOrderRetentionDto): WorkOrderRetention {
    return {
      percentage: ret?.percentage ?? 0,
      notes: ret?.notes?.trim() || null,
    };
  }

  private buildRecoveries(
    recoveries?: WorkOrderRecoveryDto[],
  ): WorkOrderRecovery[] {
    return (recoveries ?? []).map((r) => ({
      type: r.type.trim(),
      amount: r.amount,
      notes: r.notes?.trim() || null,
    }));
  }

  private buildProposedFromDto(
    wo: WorkOrder,
    dto: CreateWorkOrderAmendmentDto,
  ) {
    const boqScopeLines = dto.boqScopeLines
      ? this.buildBoqLines(dto.boqScopeLines)
      : wo.boqScopeLines.map((l) => ({
          boqItemId: l.boqItemId,
          boqCode: l.boqCode,
          description: l.description,
          unit: l.unit,
          quantity: l.quantity,
          rate: l.rate,
          value: l.value,
        }));

    const startDate = dto.startDate
      ? this.parseDate(dto.startDate, 'startDate')
      : wo.startDate;
    const endDate = dto.endDate
      ? this.parseDate(dto.endDate, 'endDate')
      : wo.endDate;
    this.assertDateRange(startDate, endDate);

    const contractValue =
      dto.revisedValue !== undefined
        ? dto.revisedValue
        : this.sumValues(boqScopeLines);

    return {
      boqScopeLines,
      locations:
        dto.locations !== undefined
          ? dto.locations.map((l) => l.trim()).filter(Boolean)
          : [...(wo.locations ?? [])],
      startDate,
      endDate,
      milestones:
        dto.milestones !== undefined
          ? this.buildMilestones(dto.milestones)
          : (wo.milestones ?? []).map((m) => ({
              name: m.name,
              dueDate: m.dueDate,
              percentComplete: m.percentComplete,
              notes: m.notes,
            })),
      paymentTerms:
        dto.paymentTerms !== undefined
          ? this.buildPaymentTerms(dto.paymentTerms)
          : {
              description: wo.paymentTerms?.description ?? null,
              advancePercent: wo.paymentTerms?.advancePercent ?? null,
              billingCycle: wo.paymentTerms?.billingCycle ?? null,
            },
      retention:
        dto.retention !== undefined
          ? this.buildRetention(dto.retention)
          : {
              percentage: wo.retention?.percentage ?? 0,
              notes: wo.retention?.notes ?? null,
            },
      recoveries:
        dto.recoveries !== undefined
          ? this.buildRecoveries(dto.recoveries)
          : (wo.recoveries ?? []).map((r) => ({
              type: r.type,
              amount: r.amount,
              notes: r.notes,
            })),
      materialResponsibility:
        dto.materialResponsibility ?? wo.materialResponsibility,
      labourResponsibility:
        dto.labourResponsibility ?? wo.labourResponsibility,
      drawingIds:
        dto.drawingIds !== undefined
          ? dto.drawingIds.map((id) => new Types.ObjectId(id))
          : [...(wo.drawingIds ?? [])],
      terms:
        dto.terms !== undefined ? dto.terms?.trim() || null : wo.terms ?? null,
      attachments:
        dto.attachments !== undefined
          ? dto.attachments
          : [...(wo.attachments ?? [])],
      contractValue,
    };
  }

  private buildFrozenRevision(input: {
    revision: number;
    amendmentId: Types.ObjectId | null;
    row: WorkOrder;
    actorId: string;
    frozenAt: Date;
  }): WorkOrderCommercialRevision {
    const { revision, amendmentId, row, actorId, frozenAt } = input;
    return {
      revision,
      amendmentId,
      boqScopeLines: (row.boqScopeLines ?? []).map((l) => ({
        boqItemId: l.boqItemId,
        boqCode: l.boqCode,
        description: l.description,
        unit: l.unit,
        quantity: l.quantity,
        rate: l.rate,
        value: l.value,
      })),
      locations: [...(row.locations ?? [])],
      startDate: row.startDate,
      endDate: row.endDate,
      milestones: (row.milestones ?? []).map((m) => ({
        name: m.name,
        dueDate: m.dueDate,
        percentComplete: m.percentComplete,
        notes: m.notes,
      })),
      paymentTerms: {
        description: row.paymentTerms?.description ?? null,
        advancePercent: row.paymentTerms?.advancePercent ?? null,
        billingCycle: row.paymentTerms?.billingCycle ?? null,
      },
      retention: {
        percentage: row.retention?.percentage ?? 0,
        notes: row.retention?.notes ?? null,
      },
      recoveries: (row.recoveries ?? []).map((r) => ({
        type: r.type,
        amount: r.amount,
        notes: r.notes,
      })),
      materialResponsibility: row.materialResponsibility,
      labourResponsibility: row.labourResponsibility,
      drawingIds: [...(row.drawingIds ?? [])],
      terms: row.terms ?? null,
      attachments: [...(row.attachments ?? [])],
      contractValue: row.contractValue,
      frozenBy: new Types.ObjectId(actorId),
      frozenAt,
    };
  }

  private buildFrozenRevisionFromProposed(input: {
    revision: number;
    amendmentId: Types.ObjectId;
    proposed: WorkOrderAmendment['proposed'];
    actorId: string;
    frozenAt: Date;
  }): WorkOrderCommercialRevision {
    const { revision, amendmentId, proposed, actorId, frozenAt } = input;
    return {
      revision,
      amendmentId,
      boqScopeLines: (proposed.boqScopeLines ?? []).map((l) => ({
        boqItemId: l.boqItemId,
        boqCode: l.boqCode,
        description: l.description,
        unit: l.unit,
        quantity: l.quantity,
        rate: l.rate,
        value: l.value,
      })),
      locations: [...(proposed.locations ?? [])],
      startDate: proposed.startDate,
      endDate: proposed.endDate,
      milestones: (proposed.milestones ?? []).map((m) => ({
        name: m.name,
        dueDate: m.dueDate,
        percentComplete: m.percentComplete,
        notes: m.notes,
      })),
      paymentTerms: {
        description: proposed.paymentTerms?.description ?? null,
        advancePercent: proposed.paymentTerms?.advancePercent ?? null,
        billingCycle: proposed.paymentTerms?.billingCycle ?? null,
      },
      retention: {
        percentage: proposed.retention?.percentage ?? 0,
        notes: proposed.retention?.notes ?? null,
      },
      recoveries: (proposed.recoveries ?? []).map((r) => ({
        type: r.type,
        amount: r.amount,
        notes: r.notes,
      })),
      materialResponsibility: proposed.materialResponsibility,
      labourResponsibility: proposed.labourResponsibility,
      drawingIds: [...(proposed.drawingIds ?? [])],
      terms: proposed.terms ?? null,
      attachments: [...(proposed.attachments ?? [])],
      contractValue: proposed.contractValue,
      frozenBy: new Types.ObjectId(actorId),
      frozenAt,
    };
  }

  private parseDate(value: string, field: string): Date {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return d;
  }

  private assertDateRange(start: Date, end: Date) {
    if (end.getTime() < start.getTime()) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
  }

  private async nextWorkOrderNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.workOrderModel
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `WO-${year}-${seq}`;
  }

  private async nextAmendmentNumber(
    projectId: string,
    workOrderNumber: string,
  ): Promise<string> {
    const count = await this.amendmentModel
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(4, '0');
    return `WOA-${workOrderNumber}-${seq}`;
  }

  private async assertSiteAccess(
    userId: string,
    projectId: string,
    siteId?: string | null,
  ) {
    await this.siteAccessService.assertSiteAccessIfScoped({
      userId,
      projectId,
      siteId: siteId ?? null,
    });
  }

  private async requireWorkOrder(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid work order id');
    }
    const row = await this.workOrderModel.findById(id).exec();
    if (!row) throw new NotFoundException('Work order not found');
    return row;
  }

  private async requireAmendment(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid work order amendment id');
    }
    const row = await this.amendmentModel.findById(id).exec();
    if (!row) throw new NotFoundException('Work order amendment not found');
    return row;
  }
}

function rowSetUpdatedBy(
  row: { set: (k: string, v: unknown) => void },
  actorId: string,
) {
  row.set('updatedBy', new Types.ObjectId(actorId));
}
