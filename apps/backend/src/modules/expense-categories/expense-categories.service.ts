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
import {
  Account,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import type {
  ConfigureEvidenceRulesDto,
  CreateExpenseCategoryDto,
  ListExpenseCategoriesQueryDto,
  SetExpenseCategoryParentDto,
  UpdateExpenseCategoryDto,
} from './dto/expense-category.dto';
import {
  buildExpenseCategoryTree,
  toPublicExpenseCategory,
} from './expense-categories.mapper';
import { STANDARD_EXPENSE_CATEGORIES } from './expense-categories.seed';
import {
  ExpenseCategory,
  ExpenseCategoryStatus,
} from './schemas/expense-category.schema';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectModel(ExpenseCategory.name)
    private readonly categoryModel: Model<ExpenseCategory>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
  ) {}

  async create(dto: CreateExpenseCategoryDto, actorId: string) {
    const categoryCode = dto.categoryCode.trim().toUpperCase();
    await this.assertCodeAvailable(categoryCode);

    const { parentCategoryId, level } = await this.resolveParent(
      dto.parentCategoryId,
    );
    const defaultLedgerAccountId = await this.resolveLedgerAccount(
      dto.defaultLedgerAccountId,
    );

    const row = await this.categoryModel.create({
      categoryCode,
      name: dto.name.trim(),
      parentCategoryId,
      level,
      defaultLedgerAccountId,
      requiresBill: dto.requiresBill ?? false,
      requiresSignature: dto.requiresSignature ?? false,
      requiresPhoto: dto.requiresPhoto ?? false,
      approvalLimit:
        dto.approvalLimit === undefined ? null : dto.approvalLimit,
      status: ExpenseCategoryStatus.Active,
      isSystem: false,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicExpenseCategory(row),
      'Expense category created',
    );
  }

  async update(
    id: string,
    dto: UpdateExpenseCategoryDto,
    actorId: string,
  ) {
    const row = await this.requireCategory(id);

    if (dto.name !== undefined) {
      row.name = dto.name.trim();
    }
    if (dto.defaultLedgerAccountId !== undefined) {
      row.defaultLedgerAccountId = await this.resolveLedgerAccount(
        dto.defaultLedgerAccountId,
      );
    }
    if (dto.requiresBill !== undefined) {
      row.requiresBill = dto.requiresBill;
    }
    if (dto.requiresSignature !== undefined) {
      row.requiresSignature = dto.requiresSignature;
    }
    if (dto.requiresPhoto !== undefined) {
      row.requiresPhoto = dto.requiresPhoto;
    }
    if (dto.approvalLimit !== undefined) {
      row.approvalLimit = dto.approvalLimit;
    }

    if (dto.parentCategoryId !== undefined) {
      const { parentCategoryId, level } = await this.resolveParent(
        dto.parentCategoryId,
        String(row._id),
      );
      row.parentCategoryId = parentCategoryId;
      row.level = level;
      await this.relevelDescendants(String(row._id), level);
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicExpenseCategory(row),
      'Expense category updated',
    );
  }

  async configureEvidenceRules(
    id: string,
    dto: ConfigureEvidenceRulesDto,
    actorId: string,
  ) {
    if (
      dto.requiresBill === undefined &&
      dto.requiresSignature === undefined &&
      dto.requiresPhoto === undefined &&
      dto.approvalLimit === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one evidence rule field to update',
      );
    }

    const row = await this.requireCategory(id);
    if (dto.requiresBill !== undefined) row.requiresBill = dto.requiresBill;
    if (dto.requiresSignature !== undefined) {
      row.requiresSignature = dto.requiresSignature;
    }
    if (dto.requiresPhoto !== undefined) row.requiresPhoto = dto.requiresPhoto;
    if (dto.approvalLimit !== undefined) {
      row.approvalLimit = dto.approvalLimit;
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicExpenseCategory(row),
      'Expense category evidence rules updated',
    );
  }

  async setParent(
    id: string,
    dto: SetExpenseCategoryParentDto,
    actorId: string,
  ) {
    const row = await this.requireCategory(id);
    const { parentCategoryId, level } = await this.resolveParent(
      dto.parentCategoryId ?? null,
      id,
    );
    row.parentCategoryId = parentCategoryId;
    row.level = level;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    await this.relevelDescendants(id, level);
    return createSuccessResponse(
      toPublicExpenseCategory(row),
      'Expense category hierarchy updated',
    );
  }

  async activate(id: string, actorId: string) {
    const row = await this.requireCategory(id);
    if (
      row.parentCategoryId &&
      (
        await this.requireCategory(String(row.parentCategoryId))
      ).status !== ExpenseCategoryStatus.Active
    ) {
      throw new BadRequestException(
        'Activate the parent category before activating this category',
      );
    }
    row.status = ExpenseCategoryStatus.Active;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicExpenseCategory(row),
      'Expense category activated',
    );
  }

  async deactivate(id: string, actorId: string) {
    const row = await this.requireCategory(id);
    const childActive = await this.categoryModel
      .countDocuments({
        parentCategoryId: row._id,
        status: ExpenseCategoryStatus.Active,
      })
      .exec();
    if (childActive > 0) {
      throw new BadRequestException(
        'Deactivate child categories before deactivating a parent',
      );
    }
    row.status = ExpenseCategoryStatus.Inactive;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicExpenseCategory(row),
      'Expense category deactivated',
    );
  }

  async remove(id: string, actorId: string) {
    const row = await this.requireCategory(id);
    if (row.isSystem) {
      throw new BadRequestException('System expense categories cannot be deleted');
    }
    const children = await this.categoryModel
      .countDocuments({ parentCategoryId: row._id })
      .exec();
    if (children > 0) {
      throw new BadRequestException(
        'Move or delete child categories before deleting this category',
      );
    }
    await row.softDelete(new Types.ObjectId(actorId));
    return createSuccessResponse(
      { id: String(row._id) },
      'Expense category deleted',
    );
  }

  async getById(id: string) {
    const row = await this.requireCategory(id);
    return createSuccessResponse(toPublicExpenseCategory(row));
  }

  async getByCode(categoryCode: string) {
    const row = await this.categoryModel
      .findOne({ categoryCode: categoryCode.trim().toUpperCase() })
      .exec();
    if (!row) {
      throw new NotFoundException('Expense category not found');
    }
    return createSuccessResponse(toPublicExpenseCategory(row));
  }

  async list(query: ListExpenseCategoriesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter: FilterQuery<ExpenseCategory> = {};

    if (query.status) filter.status = query.status;
    if (query.parentCategoryId) {
      filter.parentCategoryId = new Types.ObjectId(query.parentCategoryId);
    }
    if (query.rootsOnly) {
      filter.parentCategoryId = null;
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      filter.$or = [
        { categoryCode: new RegExp(q, 'i') },
        { name: new RegExp(q, 'i') },
      ];
    }

    const sort: Record<string, SortOrder> = { categoryCode: 1 };
    const [rows, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => toPublicExpenseCategory(r)),
      'Expense categories',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getTree(status?: ExpenseCategoryStatus) {
    const filter: FilterQuery<ExpenseCategory> = {};
    if (status) filter.status = status;

    const rows = await this.categoryModel
      .find(filter)
      .sort({ categoryCode: 1 })
      .exec();

    const tree = buildExpenseCategoryTree(
      rows.map((r) => toPublicExpenseCategory(r)),
    );
    return createSuccessResponse(tree, 'Expense category tree');
  }

  /**
   * Idempotent seed of standard construction expense categories.
   */
  async seedStandard(actorId?: string) {
    const codeToId = new Map<string, Types.ObjectId>();
    const codeToLevel = new Map<string, number>();
    let created = 0;
    let skipped = 0;

    const existing = await this.categoryModel.find({}).lean().exec();
    for (const row of existing) {
      codeToId.set(row.categoryCode, row._id as Types.ObjectId);
      codeToLevel.set(row.categoryCode, row.level);
    }

    for (const def of STANDARD_EXPENSE_CATEGORIES) {
      if (codeToId.has(def.categoryCode)) {
        skipped += 1;
        continue;
      }

      let parentCategoryId: Types.ObjectId | null = null;
      let level = 1;
      if (def.parentCode) {
        const parentId = codeToId.get(def.parentCode);
        const parentLevel = codeToLevel.get(def.parentCode);
        if (!parentId || parentLevel == null) {
          throw new BadRequestException(
            `Seed parent ${def.parentCode} missing for ${def.categoryCode}`,
          );
        }
        parentCategoryId = parentId;
        level = parentLevel + 1;
      }

      const row = await this.categoryModel.create({
        categoryCode: def.categoryCode,
        name: def.name,
        parentCategoryId,
        level,
        defaultLedgerAccountId: null,
        requiresBill: def.requiresBill ?? false,
        requiresSignature: def.requiresSignature ?? false,
        requiresPhoto: def.requiresPhoto ?? false,
        approvalLimit: def.approvalLimit ?? null,
        status: ExpenseCategoryStatus.Active,
        isSystem: true,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });

      codeToId.set(def.categoryCode, row._id as Types.ObjectId);
      codeToLevel.set(def.categoryCode, level);
      created += 1;
    }

    return createSuccessResponse(
      {
        created,
        skipped,
        total: STANDARD_EXPENSE_CATEGORIES.length,
      },
      created > 0
        ? 'Standard expense categories seeded'
        : 'Standard expense categories already present',
    );
  }

  // ─── internals ─────────────────────────────────────────────────────────

  private async assertCodeAvailable(categoryCode: string) {
    const existing = await this.categoryModel
      .findOne({ categoryCode })
      .setOptions({ withDeleted: true })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(
        `Expense category code ${categoryCode} already exists`,
      );
    }
  }

  private async resolveParent(
    parentCategoryId: string | null | undefined,
    movingId?: string,
  ): Promise<{ parentCategoryId: Types.ObjectId | null; level: number }> {
    if (!parentCategoryId) {
      return { parentCategoryId: null, level: 1 };
    }

    const parent = await this.requireCategory(parentCategoryId);
    if (parent.status !== ExpenseCategoryStatus.Active) {
      throw new BadRequestException('Parent category is inactive');
    }
    if (movingId && String(parent._id) === movingId) {
      throw new BadRequestException('Category cannot be its own parent');
    }
    if (movingId) {
      await this.assertNotDescendant(movingId, String(parent._id));
    }

    return {
      parentCategoryId: parent._id as Types.ObjectId,
      level: parent.level + 1,
    };
  }

  private async assertNotDescendant(
    categoryId: string,
    candidateParentId: string,
  ) {
    let currentId: string | null = candidateParentId;
    const guard = new Set<string>();
    while (currentId) {
      if (currentId === categoryId) {
        throw new BadRequestException(
          'Cannot move a category under one of its descendants',
        );
      }
      if (guard.has(currentId)) break;
      guard.add(currentId);
      const node = await this.categoryModel.findById(currentId).lean().exec();
      currentId = node?.parentCategoryId
        ? String(node.parentCategoryId)
        : null;
    }
  }

  private async relevelDescendants(categoryId: string, parentLevel: number) {
    const children = await this.categoryModel
      .find({ parentCategoryId: new Types.ObjectId(categoryId) })
      .exec();
    for (const child of children) {
      child.level = parentLevel + 1;
      await child.save();
      await this.relevelDescendants(String(child._id), child.level);
    }
  }

  private async resolveLedgerAccount(
    ledgerAccountId: string | null | undefined,
  ): Promise<Types.ObjectId | null> {
    if (ledgerAccountId === undefined || ledgerAccountId === null) {
      return null;
    }
    if (!Types.ObjectId.isValid(ledgerAccountId)) {
      throw new BadRequestException('defaultLedgerAccountId is invalid');
    }
    const account = await this.accountModel.findById(ledgerAccountId).exec();
    if (!account) {
      throw new BadRequestException('Default ledger account not found');
    }
    if (account.status !== AccountStatus.Active) {
      throw new BadRequestException('Default ledger account is inactive');
    }
    if (account.accountType !== AccountType.Expense) {
      throw new BadRequestException(
        'defaultLedgerAccountId must reference an expense account',
      );
    }
    return account._id as Types.ObjectId;
  }

  private async requireCategory(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Expense category not found');
    }
    const row = await this.categoryModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Expense category not found');
    }
    return row;
  }
}
