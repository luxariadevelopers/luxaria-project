import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { FinancialYear } from '../financial-year/schemas/financial-year.schema';
import { toPublicBudget } from './budgets.mapper';
import type {
  BudgetLineDto,
  CreateBudgetDto,
  ListBudgetsQueryDto,
  RejectBudgetDto,
  ReviseBudgetDto,
  UpdateBudgetDto,
} from './dto/budget.dto';
import {
  Budget,
  BudgetLine,
  BudgetStatus,
} from './schemas/budget.schema';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class BudgetsService {
  constructor(
    @InjectModel(Budget.name)
    private readonly model: Model<Budget>,
    @InjectModel(FinancialYear.name)
    private readonly financialYearModel: Model<FinancialYear>,
  ) {}

  async create(dto: CreateBudgetDto, actorId: string) {
    await this.requireFinancialYear(dto.financialYearId);
    const lines = this.mapLines(dto.lines ?? []);
    const totalAmount = this.sumLines(lines);

    const budgetNumber = await this.nextNumber(dto.companyId);
    const row = await this.model.create({
      budgetNumber,
      companyId: new Types.ObjectId(dto.companyId),
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      financialYearId: new Types.ObjectId(dto.financialYearId),
      name: dto.name.trim(),
      version: 1,
      rootBudgetId: null,
      revisedFromId: null,
      status: BudgetStatus.Draft,
      lines,
      totalAmount,
      notes: dto.notes?.trim() ?? null,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      createdBy: new Types.ObjectId(actorId),
    });

    row.rootBudgetId = row._id;
    await row.save();

    return createSuccessResponse(
      toPublicBudget(row),
      'Budget created',
    );
  }

  async update(id: string, dto: UpdateBudgetDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== BudgetStatus.Draft) {
      throw new BadRequestException('Only draft budgets can be updated');
    }

    if (dto.financialYearId) {
      await this.requireFinancialYear(dto.financialYearId);
      row.financialYearId = new Types.ObjectId(dto.financialYearId);
    }
    if (dto.projectId !== undefined) {
      row.projectId = dto.projectId
        ? new Types.ObjectId(dto.projectId)
        : null;
    }
    if (dto.name !== undefined) {
      row.name = dto.name.trim();
    }
    if (dto.lines !== undefined) {
      row.lines = this.mapLines(dto.lines);
      row.totalAmount = this.sumLines(row.lines);
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() ?? null;
    }

    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(toPublicBudget(row), 'Budget updated');
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== BudgetStatus.Draft) {
      throw new BadRequestException('Only draft budgets can be submitted');
    }
    if (!row.lines?.length) {
      throw new BadRequestException('Budget must have at least one line');
    }
    row.status = BudgetStatus.PendingApproval;
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicBudget(row), 'Budget submitted');
  }

  async approve(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== BudgetStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending_approval budgets can be approved',
      );
    }
    row.status = BudgetStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicBudget(row), 'Budget approved');
  }

  async reject(id: string, dto: RejectBudgetDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== BudgetStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending_approval budgets can be rejected',
      );
    }
    row.status = BudgetStatus.Draft;
    row.rejectionReason = dto.reason.trim();
    row.approvedBy = null;
    row.approvedAt = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicBudget(row), 'Budget rejected');
  }

  async revise(id: string, dto: ReviseBudgetDto, actorId: string) {
    const source = await this.requireRow(id);
    if (source.status !== BudgetStatus.Approved) {
      throw new BadRequestException('Only approved budgets can be revised');
    }

    const lines = dto.lines?.length
      ? this.mapLines(dto.lines)
      : source.lines.map((line) => ({
          accountId: line.accountId,
          costCentreId: line.costCentreId,
          periodMonth: line.periodMonth,
          amount: line.amount,
          notes: line.notes,
        }));
    const totalAmount = this.sumLines(lines);

    source.status = BudgetStatus.Superseded;
    source.set('updatedBy', new Types.ObjectId(actorId));
    await source.save();

    const budgetNumber = await this.nextNumber(String(source.companyId));
    const row = await this.model.create({
      budgetNumber,
      companyId: source.companyId,
      projectId: source.projectId,
      financialYearId: source.financialYearId,
      name: dto.name?.trim() ?? source.name,
      version: source.version + 1,
      rootBudgetId: source.rootBudgetId ?? source._id,
      revisedFromId: source._id,
      status: BudgetStatus.Draft,
      lines,
      totalAmount,
      notes: dto.notes?.trim() ?? source.notes,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(toPublicBudget(row), 'Budget revision created');
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (
      row.status !== BudgetStatus.Draft &&
      row.status !== BudgetStatus.PendingApproval
    ) {
      throw new BadRequestException(
        'Only draft or pending_approval budgets can be cancelled',
      );
    }
    row.status = BudgetStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicBudget(row), 'Budget cancelled');
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(toPublicBudget(row), 'Budget fetched');
  }

  async list(query: ListBudgetsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<Budget> = {};
    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.financialYearId) {
      filter.financialYearId = new Types.ObjectId(query.financialYearId);
    }
    if (query.status) filter.status = query.status;
    if (query.rootBudgetId) {
      filter.rootBudgetId = new Types.ObjectId(query.rootBudgetId);
    }

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
      items.map((row) => toPublicBudget(row)),
      'Budgets fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  /**
   * Sum approved budget line amounts for commitment checks.
   * When multiple approved versions exist for a root chain, uses the latest approved version only.
   */
  async getApprovedBudgetAmount(
    accountId: string,
    projectId: string | null | undefined,
    financialYearId: string,
    costCentreId?: string | null,
  ): Promise<number> {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new BadRequestException('Invalid accountId');
    }
    if (!Types.ObjectId.isValid(financialYearId)) {
      throw new BadRequestException('Invalid financialYearId');
    }

    const filter: FilterQuery<Budget> = {
      status: BudgetStatus.Approved,
      financialYearId: new Types.ObjectId(financialYearId),
      'lines.accountId': new Types.ObjectId(accountId),
    };
    if (projectId) {
      filter.projectId = new Types.ObjectId(projectId);
    } else {
      filter.projectId = null;
    }

    const budgets = await this.model.find(filter).lean().exec();
    const latestByRoot = new Map<string, (typeof budgets)[number]>();
    for (const budget of budgets) {
      const rootKey = String(budget.rootBudgetId ?? budget._id);
      const existing = latestByRoot.get(rootKey);
      if (!existing || (budget.version ?? 0) > (existing.version ?? 0)) {
        latestByRoot.set(rootKey, budget);
      }
    }

    let total = 0;
    for (const budget of latestByRoot.values()) {
      for (const line of budget.lines ?? []) {
        if (String(line.accountId) !== accountId) continue;
        if (
          costCentreId &&
          (!line.costCentreId || String(line.costCentreId) !== costCentreId)
        ) {
          continue;
        }
        total += line.amount ?? 0;
      }
    }
    return roundMoney(total);
  }

  private mapLines(lines: BudgetLineDto[]): BudgetLine[] {
    if (!lines.length) {
      throw new BadRequestException('Budget requires at least one line');
    }
    return lines.map((line) => ({
      accountId: new Types.ObjectId(line.accountId),
      costCentreId: line.costCentreId
        ? new Types.ObjectId(line.costCentreId)
        : null,
      periodMonth: line.periodMonth ?? null,
      amount: roundMoney(line.amount),
      notes: line.notes?.trim() ?? null,
    }));
  }

  private sumLines(lines: Array<{ amount: number }>): number {
    return roundMoney(lines.reduce((sum, line) => sum + (line.amount ?? 0), 0));
  }

  private async requireFinancialYear(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid financialYearId');
    }
    const fy = await this.financialYearModel.findById(id).exec();
    if (!fy) throw new NotFoundException('Financial year not found');
    return fy;
  }

  private async nextNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.model
      .countDocuments({ companyId: new Types.ObjectId(companyId) })
      .setOptions({ withDeleted: true })
      .exec();
    return `BUD-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid budget id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Budget not found');
    return row;
  }
}
