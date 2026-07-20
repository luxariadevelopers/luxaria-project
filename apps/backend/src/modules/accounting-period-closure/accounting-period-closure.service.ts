import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/schemas/audit-log.schema';
import {
  FinancialYear,
  FinancialYearStatus,
} from '../financial-year/schemas/financial-year.schema';
import {
  AccountingPeriodStatus,
  AccountingPeriodType,
  PERIOD_CHECKLIST_DEFINITIONS,
  PeriodChecklistItemStatus,
  PeriodReopenRequestStatus,
} from './accounting-period-closure.constants';
import { AccountingPeriodValidationService } from './accounting-period-validation.service';
import type {
  ApprovePeriodReopenDto,
  CreateAccountingPeriodDto,
  ListAccountingPeriodsQueryDto,
  RejectPeriodReopenDto,
  RequestPeriodReopenDto,
} from './dto/accounting-period-closure.dto';
import { AccountingPeriod } from './schemas/accounting-period.schema';
import { PeriodReopenRequest } from './schemas/period-reopen-request.schema';

const MODULE = 'accounting_period_closure';

@Injectable()
export class AccountingPeriodClosureService {
  constructor(
    @InjectModel(AccountingPeriod.name)
    private readonly periodModel: Model<AccountingPeriod>,
    @InjectModel(PeriodReopenRequest.name)
    private readonly reopenModel: Model<PeriodReopenRequest>,
    @InjectModel(FinancialYear.name)
    private readonly fyModel: Model<FinancialYear>,
    private readonly validationService: AccountingPeriodValidationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createPeriod(dto: CreateAccountingPeriodDto, actorId: string) {
    const fy = await this.requireFinancialYear(dto.financialYearId);
    const companyId = dto.companyId
      ? new Types.ObjectId(dto.companyId)
      : fy.companyId;

    let periodFrom: Date;
    let periodTo: Date;
    let year: number | null = null;
    let month: number | null = null;

    if (dto.periodType === AccountingPeriodType.Monthly) {
      if (!dto.month) {
        throw new BadRequestException('month is required for monthly periods');
      }
      month = dto.month;
      year = dto.year ?? this.inferYearForMonth(fy, month);
      const bounds = this.monthBounds(year, month);
      periodFrom = bounds.from;
      periodTo = bounds.to;
      if (periodFrom < this.startOfDay(fy.startDate) || periodTo > this.endOfDay(fy.endDate)) {
        throw new BadRequestException(
          'Monthly period must fall within the financial year date range',
        );
      }
    } else {
      periodFrom = this.startOfDay(fy.startDate);
      periodTo = this.endOfDay(fy.endDate);
    }

    const existing = await this.periodModel
      .findOne(
        dto.periodType === AccountingPeriodType.Monthly
          ? {
              financialYearId: fy._id,
              periodType: AccountingPeriodType.Monthly,
              year,
              month,
            }
          : {
              financialYearId: fy._id,
              periodType: AccountingPeriodType.FinancialYear,
            },
      )
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException('Accounting period already exists');
    }

    const period = await this.periodModel.create({
      periodNumber: this.nextPeriodNumber(dto.periodType, year, month, fy),
      periodType: dto.periodType,
      companyId,
      financialYearId: fy._id,
      year,
      month,
      periodFrom,
      periodTo,
      status: AccountingPeriodStatus.Open,
      checklist: this.emptyChecklist(),
      validationRunAt: null,
      validationPassed: false,
      createdBy: new Types.ObjectId(actorId),
      notes: dto.notes?.trim() ?? null,
    });

    await this.audit(
      actorId,
      AuditAction.CREATE,
      'accounting_period',
      String(period._id),
      null,
      this.toPublicPeriod(period),
    );

    return createSuccessResponse(
      this.toPublicPeriod(period),
      'Accounting period created',
    );
  }

  async listPeriods(query: ListAccountingPeriodsQueryDto) {
    const filter: FilterQuery<AccountingPeriod> = {};
    if (query.financialYearId) {
      filter.financialYearId = new Types.ObjectId(query.financialYearId);
    }
    if (query.periodType) filter.periodType = query.periodType;
    if (query.status) filter.status = query.status as AccountingPeriodStatus;

    const rows = await this.periodModel
      .find(filter)
      .sort({ periodFrom: -1 })
      .limit(200)
      .lean()
      .exec();

    return createSuccessResponse(
      rows.map((r) => this.toPublicPeriod(r)),
      'Accounting periods',
    );
  }

  async getPeriod(periodId: string) {
    const period = await this.requirePeriod(periodId);
    return createSuccessResponse(
      this.toPublicPeriod(period),
      'Accounting period',
    );
  }

  async getChecklist(periodId: string) {
    const period = await this.requirePeriod(periodId);
    return createSuccessResponse(
      {
        periodId: String(period._id),
        validationRunAt: period.validationRunAt
          ? new Date(period.validationRunAt).toISOString()
          : null,
        validationPassed: period.validationPassed,
        checklist: (period.checklist ?? []).map((c) => this.toPublicChecklistItem(c)),
      },
      'Closing checklist',
    );
  }

  async runPreCloseValidation(periodId: string, actorId: string) {
    const period = await this.requireOpenPeriod(periodId);
    const before = this.toPublicPeriod(period);

    const result = await this.validationService.runValidations(
      period.periodFrom,
      period.periodTo,
    );

    period.checklist = result.checklist;
    period.validationRunAt = new Date();
    period.validationPassed = result.validationPassed;
    await period.save();

    await this.audit(
      actorId,
      AuditAction.UPDATE,
      'accounting_period_validation',
      String(period._id),
      before,
      {
        validationPassed: result.validationPassed,
        failedCount: result.failedCount,
        checklist: result.checklist.map((c) => ({
          key: c.key,
          status: c.status,
          issueCount: c.issueCount,
        })),
      },
    );

    return createSuccessResponse(
      {
        ...this.toPublicPeriod(period),
        failedCount: result.failedCount,
      },
      result.validationPassed
        ? 'Pre-close validation passed'
        : 'Pre-close validation failed; resolve checklist items before lock',
    );
  }

  async lockPeriod(periodId: string, actorId: string) {
    const period = await this.requireOpenPeriod(periodId);
    if (!period.validationPassed) {
      throw new BadRequestException(
        'Run pre-close validation and resolve all checklist failures before locking',
      );
    }
    const failed = (period.checklist ?? []).filter(
      (c) => c.status === PeriodChecklistItemStatus.Failed,
    );
    if (failed.length > 0) {
      throw new BadRequestException(
        `Cannot lock period: ${failed.length} checklist item(s) failed`,
      );
    }

    const before = this.toPublicPeriod(period);
    period.status = AccountingPeriodStatus.Locked;
    period.lockedAt = new Date();
    period.lockedBy = new Types.ObjectId(actorId);
    await period.save();

    if (period.periodType === AccountingPeriodType.FinancialYear) {
      await this.fyModel
        .findByIdAndUpdate(period.financialYearId, {
          isLocked: true,
          status: FinancialYearStatus.Locked,
          lockedAt: period.lockedAt,
          lockedBy: period.lockedBy,
        })
        .exec();
    }

    await this.audit(
      actorId,
      AuditAction.UPDATE,
      'accounting_period',
      String(period._id),
      before,
      this.toPublicPeriod(period),
    );

    return createSuccessResponse(
      this.toPublicPeriod(period),
      'Accounting period locked',
    );
  }

  async closePeriod(periodId: string, actorId: string) {
    const period = await this.requirePeriod(periodId);
    if (period.status === AccountingPeriodStatus.Closed) {
      throw new ConflictException('Period is already closed');
    }
    if (period.status !== AccountingPeriodStatus.Locked) {
      throw new BadRequestException('Period must be locked before close');
    }

    const before = this.toPublicPeriod(period);
    period.status = AccountingPeriodStatus.Closed;
    period.closedAt = new Date();
    period.closedBy = new Types.ObjectId(actorId);
    await period.save();

    if (period.periodType === AccountingPeriodType.FinancialYear) {
      await this.fyModel
        .findByIdAndUpdate(period.financialYearId, {
          isLocked: true,
          status: FinancialYearStatus.Closed,
          lockedAt: period.lockedAt ?? period.closedAt,
          lockedBy: period.lockedBy ?? period.closedBy,
        })
        .exec();
    }

    await this.audit(
      actorId,
      AuditAction.APPROVE,
      'accounting_period',
      String(period._id),
      before,
      this.toPublicPeriod(period),
    );

    return createSuccessResponse(
      this.toPublicPeriod(period),
      'Accounting period closed',
    );
  }

  async requestReopen(
    periodId: string,
    dto: RequestPeriodReopenDto,
    actorId: string,
  ) {
    const period = await this.requirePeriod(periodId);
    if (
      period.status !== AccountingPeriodStatus.Locked &&
      period.status !== AccountingPeriodStatus.Closed
    ) {
      throw new BadRequestException('Only locked or closed periods can be reopened');
    }

    const pending = await this.reopenModel
      .findOne({
        periodId: period._id,
        status: PeriodReopenRequestStatus.Pending,
      })
      .exec();
    if (pending) {
      throw new ConflictException('A reopen request is already pending');
    }

    const request = await this.reopenModel.create({
      periodId: period._id,
      reason: dto.reason.trim(),
      requestedBy: new Types.ObjectId(actorId),
      status: PeriodReopenRequestStatus.Pending,
      createdBy: new Types.ObjectId(actorId),
    });

    await this.audit(
      actorId,
      AuditAction.CREATE,
      'accounting_period_reopen_request',
      String(request._id),
      null,
      this.toPublicReopen(request),
    );

    return createSuccessResponse(
      this.toPublicReopen(request),
      'Reopen request submitted; awaiting approval',
    );
  }

  async approveReopen(
    periodId: string,
    requestId: string,
    dto: ApprovePeriodReopenDto,
    actorId: string,
  ) {
    const period = await this.requirePeriod(periodId);
    const request = await this.requireReopenRequest(requestId, periodId);
    if (request.status !== PeriodReopenRequestStatus.Pending) {
      throw new BadRequestException('Reopen request is not pending');
    }
    if (String(request.requestedBy) === actorId) {
      throw new ForbiddenException('Approver cannot be the same as requester');
    }

    const beforePeriod = this.toPublicPeriod(period);
    request.status = PeriodReopenRequestStatus.Approved;
    request.approvedBy = new Types.ObjectId(actorId);
    request.approvedAt = new Date();
    request.approvalNote = dto.approvalNote?.trim() ?? null;
    await request.save();

    period.status = AccountingPeriodStatus.Open;
    period.lockedAt = null;
    period.lockedBy = null;
    period.closedAt = null;
    period.closedBy = null;
    period.validationPassed = false;
    await period.save();

    if (period.periodType === AccountingPeriodType.FinancialYear) {
      await this.fyModel
        .findByIdAndUpdate(period.financialYearId, {
          isLocked: false,
          status: FinancialYearStatus.Open,
          lockedAt: null,
          lockedBy: null,
        })
        .exec();
    }

    await this.audit(
      actorId,
      AuditAction.APPROVE,
      'accounting_period_reopen_request',
      String(request._id),
      beforePeriod,
      {
        request: this.toPublicReopen(request),
        period: this.toPublicPeriod(period),
      },
    );

    return createSuccessResponse(
      {
        request: this.toPublicReopen(request),
        period: this.toPublicPeriod(period),
      },
      'Period reopen approved',
    );
  }

  async rejectReopen(
    periodId: string,
    requestId: string,
    dto: RejectPeriodReopenDto,
    actorId: string,
  ) {
    const request = await this.requireReopenRequest(requestId, periodId);
    if (request.status !== PeriodReopenRequestStatus.Pending) {
      throw new BadRequestException('Reopen request is not pending');
    }

    const before = this.toPublicReopen(request);
    request.status = PeriodReopenRequestStatus.Rejected;
    request.rejectedBy = new Types.ObjectId(actorId);
    request.rejectedAt = new Date();
    request.rejectionReason = dto.rejectionReason.trim();
    await request.save();

    await this.audit(
      actorId,
      AuditAction.REJECT,
      'accounting_period_reopen_request',
      String(request._id),
      before,
      this.toPublicReopen(request),
    );

    return createSuccessResponse(
      this.toPublicReopen(request),
      'Reopen request rejected',
    );
  }

  async listReopenRequests(periodId: string) {
    await this.requirePeriod(periodId);
    const rows = await this.reopenModel
      .find({ periodId: new Types.ObjectId(periodId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((r) => this.toPublicReopen(r)),
      'Period reopen requests',
    );
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private emptyChecklist() {
    return PERIOD_CHECKLIST_DEFINITIONS.map((d) => ({
      key: d.key,
      label: d.label,
      status: PeriodChecklistItemStatus.Pending,
      issueCount: 0,
      issues: [],
      checkedAt: null,
    }));
  }

  private nextPeriodNumber(
    type: AccountingPeriodType,
    year: number | null,
    month: number | null,
    fy: FinancialYear & { _id: Types.ObjectId },
  ) {
    if (type === AccountingPeriodType.Monthly && year && month) {
      return `AP-${year}${String(month).padStart(2, '0')}`;
    }
    const fyTag = String(fy._id).slice(-6).toUpperCase();
    return `AP-FY-${fyTag}`;
  }

  private inferYearForMonth(fy: FinancialYear, month: number): number {
    const start = new Date(fy.startDate);
    const end = new Date(fy.endDate);
    const startYear = start.getUTCFullYear();
    const endYear = end.getUTCFullYear();
    if (startYear === endYear) return startYear;
    // Indian FY style: Apr–Mar
    return month >= start.getUTCMonth() + 1 ? startYear : endYear;
  }

  private monthBounds(year: number, month: number) {
    const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { from, to };
  }

  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
  }

  private endOfDay(d: Date) {
    const x = new Date(d);
    x.setUTCHours(23, 59, 59, 999);
    return x;
  }

  private async requireFinancialYear(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid financialYearId');
    }
    const fy = await this.fyModel.findById(id).exec();
    if (!fy) throw new NotFoundException('Financial year not found');
    return fy;
  }

  private async requirePeriod(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid periodId');
    }
    const period = await this.periodModel.findById(id).exec();
    if (!period) throw new NotFoundException('Accounting period not found');
    return period;
  }

  private async requireOpenPeriod(id: string) {
    const period = await this.requirePeriod(id);
    if (period.status !== AccountingPeriodStatus.Open) {
      throw new BadRequestException('Period must be open for this action');
    }
    return period;
  }

  private async requireReopenRequest(requestId: string, periodId: string) {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new BadRequestException('Invalid requestId');
    }
    const request = await this.reopenModel.findById(requestId).exec();
    if (!request || String(request.periodId) !== periodId) {
      throw new NotFoundException('Reopen request not found');
    }
    return request;
  }

  private async audit(
    actorId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    beforeData: unknown,
    afterData: unknown,
  ) {
    await this.auditLogService.record({
      userId: actorId,
      action,
      module: MODULE,
      entityType,
      entityId,
      beforeData: beforeData as Record<string, unknown> | null,
      afterData: afterData as Record<string, unknown> | null,
    });
  }

  private toPublicPeriod(
    row: AccountingPeriod | (AccountingPeriod & { _id: Types.ObjectId }),
  ) {
    const r = row as AccountingPeriod & {
      _id: Types.ObjectId;
      toObject?: () => AccountingPeriod;
    };
    const o = typeof r.toObject === 'function' ? r.toObject() : r;
    return {
      id: String(r._id),
      periodNumber: o.periodNumber,
      periodType: o.periodType,
      companyId: o.companyId ? String(o.companyId) : null,
      financialYearId: String(o.financialYearId),
      year: o.year,
      month: o.month,
      periodFrom: new Date(o.periodFrom).toISOString(),
      periodTo: new Date(o.periodTo).toISOString(),
      status: o.status,
      validationRunAt: o.validationRunAt
        ? new Date(o.validationRunAt).toISOString()
        : null,
      validationPassed: o.validationPassed,
      checklist: (o.checklist ?? []).map((c) => this.toPublicChecklistItem(c)),
      lockedAt: o.lockedAt ? new Date(o.lockedAt).toISOString() : null,
      closedAt: o.closedAt ? new Date(o.closedAt).toISOString() : null,
      notes: o.notes,
    };
  }

  private toPublicChecklistItem(c: {
    key: string;
    label: string;
    status: string;
    issueCount: number;
    issues: unknown[];
    checkedAt: Date | null;
  }) {
    return {
      key: c.key,
      label: c.label,
      status: c.status,
      issueCount: c.issueCount,
      issues: c.issues ?? [],
      checkedAt: c.checkedAt ? new Date(c.checkedAt).toISOString() : null,
    };
  }

  private toPublicReopen(
    row: PeriodReopenRequest | (PeriodReopenRequest & { _id: Types.ObjectId }),
  ) {
    const r = row as PeriodReopenRequest & {
      _id: Types.ObjectId;
      toObject?: () => PeriodReopenRequest;
      createdAt?: Date;
    };
    const o = typeof r.toObject === 'function' ? r.toObject() : r;
    return {
      id: String(r._id),
      periodId: String(o.periodId),
      reason: o.reason,
      requestedBy: String(o.requestedBy),
      status: o.status,
      approvedBy: o.approvedBy ? String(o.approvedBy) : null,
      approvedAt: o.approvedAt ? new Date(o.approvedAt).toISOString() : null,
      approvalNote: o.approvalNote,
      rejectedBy: o.rejectedBy ? String(o.rejectedBy) : null,
      rejectedAt: o.rejectedAt ? new Date(o.rejectedAt).toISOString() : null,
      rejectionReason: o.rejectionReason,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    };
  }
}
