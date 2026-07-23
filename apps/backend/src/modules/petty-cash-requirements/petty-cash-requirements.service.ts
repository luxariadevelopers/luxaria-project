import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  CashAccountKind,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import { CashAccountsService } from '../cash-accounts/cash-accounts.service';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import type {
  CreatePettyCashRequirementDto,
  FinanceApproveDto,
  FundRequirementDto,
  ListPettyCashRequirementsQueryDto,
  ReviewActionDto,
  UpdatePettyCashRequirementDto,
} from './dto/petty-cash-requirement.dto';
import {
  toPublicRequirement,
  type ActorNameMap,
  type PublicPettyCashRequirement,
} from './petty-cash-requirements.mapper';
import {
  PettyCashExpenseDraft,
  PettyCashExpenseDraftStatus,
} from './schemas/petty-cash-expense-draft.schema';
import {
  PettyCashRequirement,
  PettyCashRequirementStatus,
} from './schemas/petty-cash-requirement.schema';
import { User } from '../users/schemas/user.schema';

export const PETTY_CASH_APPROVAL_MODULE = 'petty_cash';
export const PETTY_CASH_APPROVAL_ENTITY = 'weekly_requirement';

@Injectable()
export class PettyCashRequirementsService {
  constructor(
    @InjectModel(PettyCashRequirement.name)
    private readonly requirementModel: Model<PettyCashRequirement>,
    @InjectModel(PettyCashExpenseDraft.name)
    private readonly expenseDraftModel: Model<PettyCashExpenseDraft>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly cashAccountsService: CashAccountsService,
    private readonly approvalsService: ApprovalsService,
    private readonly numberingService: NumberingService,
  ) {}

  async create(dto: CreatePettyCashRequirementDto, actorId: string) {
    const { weekStart, weekEnd } = this.assertWeek(
      dto.weekStartDate,
      dto.weekEndDate,
    );
    const account = await this.requirePettyCashAccount(
      dto.pettyCashAccountId,
      dto.projectId,
    );
    await this.assertNoDuplicateWeek(dto.pettyCashAccountId, weekStart);

    const items = this.normalizeItems(dto.requirementItems);
    const requestedAmount = this.sumItems(items);
    const balance = await this.cashAccountsService.getBalance(account.id);
    const { previousUnsettledAmount, warnings } =
      await this.buildUnsettledContext(
        dto.pettyCashAccountId,
        weekStart,
      );

    const requestNumber = await this.numberingService.nextCode(
      NumberEntityType.PETTY_CASH_REQUIREMENT,
      {
        asOf: weekStart,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.requirementModel.create({
      requestNumber,
      projectId: new Types.ObjectId(dto.projectId),
      pettyCashAccountId: new Types.ObjectId(dto.pettyCashAccountId),
      requestedBy: new Types.ObjectId(actorId),
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      currentCashBalance: balance.data?.currentBalance ?? 0,
      previousUnsettledAmount,
      warnings,
      requestedAmount,
      approvedAmount: null,
      fundedAmount: null,
      requirementItems: items,
      justification: dto.justification.trim(),
      status: PettyCashRequirementStatus.Draft,
      approvalRequestId: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      await this.present(row),
      'Petty-cash weekly requirement created as draft',
    );
  }

  async update(
    id: string,
    dto: UpdatePettyCashRequirementDto,
    actorId: string,
  ) {
    const row = await this.requireRequirement(id);
    if (
      row.status !== PettyCashRequirementStatus.Draft &&
      row.status !== PettyCashRequirementStatus.Returned
    ) {
      throw new BadRequestException(
        'Only draft or returned requirements can be updated',
      );
    }
    if (String(row.requestedBy) !== actorId) {
      throw new ForbiddenException('Only the requester can update this request');
    }

    if (dto.weekStartDate || dto.weekEndDate) {
      const { weekStart, weekEnd } = this.assertWeek(
        dto.weekStartDate ?? row.weekStartDate.toISOString(),
        dto.weekEndDate ?? row.weekEndDate.toISOString(),
      );
      await this.assertNoDuplicateWeek(
        String(row.pettyCashAccountId),
        weekStart,
        String(row._id),
      );
      row.weekStartDate = weekStart;
      row.weekEndDate = weekEnd;
    }
    if (dto.requirementItems) {
      const items = this.normalizeItems(dto.requirementItems);
      row.requirementItems = items as PettyCashRequirement['requirementItems'];
      row.requestedAmount = this.sumItems(items);
    }
    if (dto.justification !== undefined) {
      row.justification = dto.justification.trim();
    }

    const balance = await this.cashAccountsService.getBalance(
      String(row.pettyCashAccountId),
    );
    row.currentCashBalance = balance.data?.currentBalance ?? 0;
    const ctx = await this.buildUnsettledContext(
      String(row.pettyCashAccountId),
      row.weekStartDate,
    );
    row.previousUnsettledAmount = ctx.previousUnsettledAmount;
    row.warnings = ctx.warnings;

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      await this.present(row),
      'Petty-cash requirement updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireRequirement(id);
    if (
      row.status !== PettyCashRequirementStatus.Draft &&
      row.status !== PettyCashRequirementStatus.Returned
    ) {
      throw new BadRequestException(
        'Only draft or returned requirements can be submitted',
      );
    }
    if (String(row.requestedBy) !== actorId) {
      throw new ForbiddenException('Only the requester can submit this request');
    }
    if (!row.requirementItems?.length) {
      throw new BadRequestException('Requirement items are required');
    }

    const balance = await this.cashAccountsService.getBalance(
      String(row.pettyCashAccountId),
    );
    row.currentCashBalance = balance.data?.currentBalance ?? 0;
    const ctx = await this.buildUnsettledContext(
      String(row.pettyCashAccountId),
      row.weekStartDate,
    );
    row.previousUnsettledAmount = ctx.previousUnsettledAmount;
    row.warnings = ctx.warnings;
    row.requestedAmount = this.sumItems(
      row.requirementItems.map((i) => ({
        expenseCategory: i.expenseCategory,
        description: i.description,
        estimatedAmount: i.estimatedAmount,
      })),
    );

    const approval = await this.approvalsService.create(
      String(row.projectId),
      {
        module: PETTY_CASH_APPROVAL_MODULE,
        entityType: PETTY_CASH_APPROVAL_ENTITY,
        entityId: String(row._id),
        amount: row.requestedAmount,
        reason: row.justification,
        submit: true,
      },
      actorId,
    );

    row.approvalRequestId = new Types.ObjectId(approval.data!.id);
    row.status = PettyCashRequirementStatus.Submitted;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      await this.present(row),
      ctx.warnings.length
        ? 'Submitted for approval (see warnings)'
        : 'Submitted for project manager review',
    );
  }

  async projectManagerApprove(
    id: string,
    actorId: string,
    dto: ReviewActionDto = {},
  ) {
    const row = await this.requireRequirement(id);
    if (
      row.status !== PettyCashRequirementStatus.Submitted &&
      row.status !== PettyCashRequirementStatus.ProjectManagerReview
    ) {
      throw new BadRequestException(
        'Requirement is not awaiting project manager review',
      );
    }
    row.status = PettyCashRequirementStatus.ProjectManagerReview;
    if (String(row.requestedBy) === actorId) {
      throw new ForbiddenException('Requester cannot approve their own request');
    }
    if (!row.approvalRequestId) {
      throw new BadRequestException('Approval request is missing');
    }

    const approval = await this.approvalsService.approve(
      String(row.projectId),
      String(row.approvalRequestId),
      actorId,
      { comment: dto.comment ?? 'PM approved weekly petty-cash requirement' },
    );

    row.projectManagerReviewedBy = new Types.ObjectId(actorId);
    row.projectManagerReviewedAt = new Date();
    row.status =
      approval.data?.status === ApprovalStatus.Approved
        ? PettyCashRequirementStatus.Approved
        : PettyCashRequirementStatus.FinanceReview;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      await this.present(row),
      'Project manager review completed',
    );
  }

  async financeApprove(
    id: string,
    actorId: string,
    dto: FinanceApproveDto = {},
  ) {
    const row = await this.requireRequirement(id);
    if (row.status !== PettyCashRequirementStatus.FinanceReview) {
      throw new BadRequestException(
        'Requirement is not awaiting finance review',
      );
    }
    if (String(row.requestedBy) === actorId) {
      throw new ForbiddenException('Requester cannot approve their own request');
    }
    if (!row.approvalRequestId) {
      throw new BadRequestException('Approval request is missing');
    }

    const approvedAmount =
      dto.approvedAmount !== undefined
        ? dto.approvedAmount
        : row.requestedAmount;
    if (approvedAmount < 0) {
      throw new BadRequestException('approvedAmount must be non-negative');
    }

    const approval = await this.approvalsService.approve(
      String(row.projectId),
      String(row.approvalRequestId),
      actorId,
      {
        comment:
          dto.comment ??
          `Finance approved for ${approvedAmount} (requested ${row.requestedAmount})`,
      },
    );

    if (approval.data?.status === ApprovalStatus.Approved) {
      row.status = PettyCashRequirementStatus.Approved;
      row.approvedAmount = approvedAmount;
      row.financeReviewedBy = new Types.ObjectId(actorId);
      row.financeReviewedAt = new Date();
    } else if (approval.data?.status === ApprovalStatus.Pending) {
      // Additional approval steps remain
      row.status = PettyCashRequirementStatus.FinanceReview;
      row.approvedAmount = approvedAmount;
      row.financeReviewedBy = new Types.ObjectId(actorId);
      row.financeReviewedAt = new Date();
    } else {
      throw new BadRequestException(
        'Unexpected approval status after finance act',
      );
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      await this.present(row),
      row.status === PettyCashRequirementStatus.Approved
        ? 'Finance approved weekly petty-cash requirement'
        : 'Finance review recorded',
    );
  }

  async reject(id: string, actorId: string, dto: ReviewActionDto = {}) {
    const row = await this.requireRequirement(id);
    if (
      ![
        PettyCashRequirementStatus.Submitted,
        PettyCashRequirementStatus.ProjectManagerReview,
        PettyCashRequirementStatus.FinanceReview,
      ].includes(row.status)
    ) {
      throw new BadRequestException(
        'Only requirements in review can be rejected',
      );
    }
    if (row.approvalRequestId) {
      await this.approvalsService.reject(
        String(row.projectId),
        String(row.approvalRequestId),
        actorId,
        { comment: dto.comment ?? 'Rejected' },
      );
    }
    row.status = PettyCashRequirementStatus.Rejected;
    row.rejectionReason = dto.comment?.trim() ?? null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      await this.present(row),
      'Petty-cash requirement rejected',
    );
  }

  async returnForCorrection(
    id: string,
    actorId: string,
    dto: ReviewActionDto = {},
  ) {
    const row = await this.requireRequirement(id);
    if (
      ![
        PettyCashRequirementStatus.Submitted,
        PettyCashRequirementStatus.ProjectManagerReview,
        PettyCashRequirementStatus.FinanceReview,
      ].includes(row.status)
    ) {
      throw new BadRequestException(
        'Only requirements in review can be returned',
      );
    }
    if (row.approvalRequestId) {
      await this.approvalsService.returnForCorrection(
        String(row.projectId),
        String(row.approvalRequestId),
        actorId,
        { comment: dto.comment ?? 'Returned for correction' },
      );
    }
    row.status = PettyCashRequirementStatus.Returned;
    row.rejectionReason = dto.comment?.trim() ?? null;
    row.approvalRequestId = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      await this.present(row),
      'Returned for correction',
    );
  }

  async fund(id: string, actorId: string, dto: FundRequirementDto = {}) {
    const row = await this.requireRequirement(id);
    if (row.status !== PettyCashRequirementStatus.Approved) {
      throw new BadRequestException('Only approved requirements can be funded');
    }
    const fundedAmount =
      dto.fundedAmount !== undefined
        ? dto.fundedAmount
        : (row.approvedAmount ?? row.requestedAmount);
    if (fundedAmount < 0) {
      throw new BadRequestException('fundedAmount must be non-negative');
    }
    if (
      row.approvedAmount != null &&
      fundedAmount - row.approvedAmount > 0.005
    ) {
      throw new BadRequestException(
        'fundedAmount cannot exceed approvedAmount',
      );
    }

    row.status = PettyCashRequirementStatus.Funded;
    row.fundedAmount = fundedAmount;
    row.fundedBy = new Types.ObjectId(actorId);
    row.fundedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      await this.present(row),
      'Petty-cash requirement funded',
    );
  }

  async close(id: string, actorId: string) {
    const row = await this.requireRequirement(id);
    if (row.status !== PettyCashRequirementStatus.Funded) {
      throw new BadRequestException('Only funded requirements can be closed');
    }
    row.status = PettyCashRequirementStatus.Closed;
    row.closedBy = new Types.ObjectId(actorId);
    row.closedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      await this.present(row),
      'Petty-cash requirement closed',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireRequirement(id);
    if (
      ![
        PettyCashRequirementStatus.Draft,
        PettyCashRequirementStatus.Returned,
      ].includes(row.status)
    ) {
      throw new BadRequestException(
        'Only draft or returned requirements can be cancelled',
      );
    }
    if (String(row.requestedBy) !== actorId) {
      throw new ForbiddenException('Only the requester can cancel');
    }
    row.status = PettyCashRequirementStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      await this.present(row),
      'Petty-cash requirement cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireRequirement(id);
    return createSuccessResponse(await this.present(row));
  }

  /**
   * Called when a petty-cash fund transfer is posted.
   * Increments fundedAmount and moves Approved → Funded.
   * Does not touch cash balances (those come from the posted journal).
   */
  async applyFundTransferPosted(
    requestId: string,
    amount: number,
    actorId: string,
  ) {
    const row = await this.requireRequirement(requestId);
    if (
      ![
        PettyCashRequirementStatus.Approved,
        PettyCashRequirementStatus.Funded,
      ].includes(row.status)
    ) {
      throw new BadRequestException(
        'Fund transfers can only post against approved or funded requirements',
      );
    }
    if (amount <= 0) {
      throw new BadRequestException('Transfer amount must be positive');
    }
    const nextFunded = (row.fundedAmount ?? 0) + amount;
    if (
      row.approvedAmount != null &&
      nextFunded - row.approvedAmount > 0.005
    ) {
      throw new BadRequestException(
        'Posted transfers would exceed approved request balance',
      );
    }
    row.fundedAmount = nextFunded;
    if (row.status === PettyCashRequirementStatus.Approved) {
      row.status = PettyCashRequirementStatus.Funded;
      row.fundedBy = new Types.ObjectId(actorId);
      row.fundedAt = new Date();
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return row;
  }

  async list(query: ListPettyCashRequirementsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<PettyCashRequirement> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.pettyCashAccountId) {
      filter.pettyCashAccountId = new Types.ObjectId(query.pettyCashAccountId);
    }
    if (query.status) filter.status = query.status;

    const sort: Record<string, SortOrder> = { weekStartDate: -1, createdAt: -1 };
    const [rows, total] = await Promise.all([
      this.requirementModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.requirementModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      await this.presentMany(rows),
      'Petty-cash requirements',
      buildPaginationMeta(page, limit, total),
    );
  }

  // ─── internals ─────────────────────────────────────────────────────────

  private async present(
    row: Parameters<typeof toPublicRequirement>[0],
  ): Promise<PublicPettyCashRequirement> {
    const names = await this.loadActorNames([row]);
    return toPublicRequirement(row, names);
  }

  private async presentMany(
    rows: Array<Parameters<typeof toPublicRequirement>[0]>,
  ): Promise<PublicPettyCashRequirement[]> {
    const names = await this.loadActorNames(rows);
    return rows.map((row) => toPublicRequirement(row, names));
  }

  private async loadActorNames(
    rows: Array<{
      requestedBy?: Types.ObjectId | string;
      projectManagerReviewedBy?: Types.ObjectId | string | null;
      financeReviewedBy?: Types.ObjectId | string | null;
      fundedBy?: Types.ObjectId | string | null;
      closedBy?: Types.ObjectId | string | null;
    }>,
  ): Promise<ActorNameMap> {
    const ids = new Set<string>();
    for (const row of rows) {
      for (const id of [
        row.requestedBy,
        row.projectManagerReviewedBy,
        row.financeReviewedBy,
        row.fundedBy,
        row.closedBy,
      ]) {
        if (id) ids.add(String(id));
      }
    }
    if (ids.size === 0) return new Map();
    const users = await this.userModel
      .find({ _id: { $in: [...ids].map((id) => new Types.ObjectId(id)) } })
      .select({ fullName: 1, email: 1 })
      .lean()
      .exec();
    return new Map(
      users.map((user) => [
        String(user._id),
        (user.fullName || user.email || String(user._id)).trim(),
      ]),
    );
  }


  private async buildUnsettledContext(
    pettyCashAccountId: string,
    weekStart: Date,
  ): Promise<{ previousUnsettledAmount: number; warnings: string[] }> {
    const priorFunded = await this.requirementModel
      .find({
        pettyCashAccountId: new Types.ObjectId(pettyCashAccountId),
        status: PettyCashRequirementStatus.Funded,
        weekEndDate: { $lt: weekStart },
      })
      .lean()
      .exec();

    const previousUnsettledAmount = Math.round(
      priorFunded.reduce(
        (sum, r) => sum + (r.fundedAmount ?? r.approvedAmount ?? 0),
        0,
      ) * 100,
    ) / 100;

    const warnings: string[] = [];
    if (previousUnsettledAmount > 0) {
      warnings.push(
        `Previous unsettled amount: ${previousUnsettledAmount} (funded weeks not yet closed)`,
      );
    }

    const unsubmittedCount = await this.expenseDraftModel
      .countDocuments({
        pettyCashAccountId: new Types.ObjectId(pettyCashAccountId),
        status: PettyCashExpenseDraftStatus.Draft,
        expenseDate: { $lt: weekStart },
      })
      .exec();

    if (unsubmittedCount > 0) {
      warnings.push(
        `${unsubmittedCount} old expense draft(s) are not submitted`,
      );
    }

    return { previousUnsettledAmount, warnings };
  }

  private assertWeek(startRaw: string | Date, endRaw: string | Date) {
    const weekStart = this.startOfDay(
      typeof startRaw === 'string' ? new Date(startRaw) : startRaw,
    );
    const weekEnd = this.endOfDay(
      typeof endRaw === 'string' ? new Date(endRaw) : endRaw,
    );
    if (Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime())) {
      throw new BadRequestException('Invalid weekStartDate or weekEndDate');
    }
    if (weekEnd < weekStart) {
      throw new BadRequestException('weekEndDate must be on or after weekStartDate');
    }
    const spanMs = weekEnd.getTime() - weekStart.getTime();
    const spanDays = spanMs / (24 * 60 * 60 * 1000);
    if (spanDays > 7.01) {
      throw new BadRequestException('Week range cannot exceed 7 days');
    }
    return { weekStart, weekEnd };
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

  private normalizeItems(
    items: Array<{
      expenseCategory: string;
      description: string;
      estimatedAmount: number;
    }>,
  ) {
    if (!items?.length) {
      throw new BadRequestException('At least one requirement item is required');
    }
    return items.map((item, index) => {
      if (item.estimatedAmount < 0) {
        throw new BadRequestException(
          `Item ${index + 1}: estimatedAmount must be non-negative`,
        );
      }
      if (!item.description?.trim()) {
        throw new BadRequestException(`Item ${index + 1}: description is required`);
      }
      return {
        expenseCategory: item.expenseCategory,
        description: item.description.trim(),
        estimatedAmount: Math.round(item.estimatedAmount * 100) / 100,
      };
    });
  }

  private sumItems(
    items: Array<{ estimatedAmount: number }>,
  ): number {
    const total = items.reduce((s, i) => s + i.estimatedAmount, 0);
    if (total <= 0) {
      throw new BadRequestException('requestedAmount must be greater than zero');
    }
    return Math.round(total * 100) / 100;
  }

  private async assertNoDuplicateWeek(
    pettyCashAccountId: string,
    weekStart: Date,
    excludeId?: string,
  ) {
    const filter: FilterQuery<PettyCashRequirement> = {
      pettyCashAccountId: new Types.ObjectId(pettyCashAccountId),
      weekStartDate: weekStart,
      status: {
        $nin: [
          PettyCashRequirementStatus.Cancelled,
          PettyCashRequirementStatus.Rejected,
        ],
      },
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await this.requirementModel.findOne(filter).lean().exec();
    if (existing) {
      throw new ConflictException(
        'A petty-cash requirement already exists for this account and week',
      );
    }
  }

  private async requirePettyCashAccount(
    pettyCashAccountId: string,
    projectId: string,
  ) {
    const account = await this.cashAccountsService.getById(pettyCashAccountId);
    const data = account.data;
    if (!data) {
      throw new NotFoundException('Petty-cash account not found');
    }
    if (data.kind !== CashAccountKind.PettyCash) {
      throw new BadRequestException(
        'pettyCashAccountId must reference a petty_cash account',
      );
    }
    if (data.projectId !== projectId) {
      throw new BadRequestException(
        'Petty-cash account does not belong to this project',
      );
    }
    if (data.status === CashAccountStatus.Closed) {
      throw new BadRequestException('Petty-cash account is closed');
    }
    return data;
  }

  private async requireRequirement(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Petty-cash requirement not found');
    }
    const row = await this.requirementModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Petty-cash requirement not found');
    }
    return row;
  }
}
