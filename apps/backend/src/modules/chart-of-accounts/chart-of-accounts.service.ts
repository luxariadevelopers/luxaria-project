import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  buildAccountTree,
  toPublicAccount,
} from './chart-of-accounts.mapper';
import { STANDARD_CONSTRUCTION_COA } from './chart-of-accounts.seed';
import type {
  CreateAccountDto,
  ListAccountsQueryDto,
  SetAccountParentDto,
  UpdateAccountDto,
} from './dto/account.dto';
import {
  Account,
  AccountStatus,
} from './schemas/account.schema';

@Injectable()
export class ChartOfAccountsService {
  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
  ) {}

  async create(dto: CreateAccountDto, actorId: string) {
    const accountCode = dto.accountCode.trim().toUpperCase();
    await this.assertCodeAvailable(accountCode);

    const isControl = dto.isControlAccount ?? false;
    const allowManual =
      dto.allowManualPosting ?? (isControl ? false : true);

    const { parentAccountId, level } = await this.resolveParent(
      dto.parentAccountId,
      dto.accountType,
    );

    const row = await this.accountModel.create({
      accountCode,
      accountName: dto.accountName.trim(),
      accountType: dto.accountType,
      accountCategory: dto.accountCategory,
      parentAccountId,
      level,
      isControlAccount: isControl,
      allowManualPosting: allowManual,
      requiresProject: dto.requiresProject ?? false,
      requiresParty: dto.requiresParty ?? false,
      status: AccountStatus.Active,
      postingCount: 0,
      isSystem: false,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(toPublicAccount(row), 'Account created');
  }

  async update(id: string, dto: UpdateAccountDto, actorId: string) {
    const row = await this.requireAccount(id);

    if (dto.accountName !== undefined) {
      row.accountName = dto.accountName.trim();
    }
    if (dto.accountType !== undefined) {
      if (row.isSystem) {
        throw new BadRequestException('System account type cannot be changed');
      }
      row.accountType = dto.accountType;
    }
    if (dto.accountCategory !== undefined) {
      row.accountCategory = dto.accountCategory;
    }
    if (dto.isControlAccount !== undefined) {
      row.isControlAccount = dto.isControlAccount;
    }
    if (dto.allowManualPosting !== undefined) {
      row.allowManualPosting = dto.allowManualPosting;
    }
    if (dto.requiresProject !== undefined) {
      row.requiresProject = dto.requiresProject;
    }
    if (dto.requiresParty !== undefined) {
      row.requiresParty = dto.requiresParty;
    }

    if (dto.parentAccountId !== undefined) {
      const { parentAccountId, level } = await this.resolveParent(
        dto.parentAccountId,
        row.accountType,
        String(row._id),
      );
      row.parentAccountId = parentAccountId;
      row.level = level;
      await this.relevelDescendants(String(row._id), level);
    } else if (dto.accountType !== undefined && row.parentAccountId) {
      const parent = await this.requireAccount(String(row.parentAccountId));
      if (parent.accountType !== row.accountType) {
        throw new BadRequestException(
          'Account type must match parent account type',
        );
      }
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicAccount(row), 'Account updated');
  }

  async setParent(id: string, dto: SetAccountParentDto, actorId: string) {
    const row = await this.requireAccount(id);
    const { parentAccountId, level } = await this.resolveParent(
      dto.parentAccountId ?? null,
      row.accountType,
      id,
    );
    row.parentAccountId = parentAccountId;
    row.level = level;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    await this.relevelDescendants(id, level);
    return createSuccessResponse(
      toPublicAccount(row),
      'Account hierarchy updated',
    );
  }

  async activate(id: string, actorId: string) {
    const row = await this.requireAccount(id);
    row.status = AccountStatus.Active;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicAccount(row), 'Account activated');
  }

  async deactivate(id: string, actorId: string) {
    const row = await this.requireAccount(id);
    const childActive = await this.accountModel
      .countDocuments({
        parentAccountId: row._id,
        status: AccountStatus.Active,
      })
      .exec();
    if (childActive > 0) {
      throw new BadRequestException(
        'Deactivate child accounts before deactivating a parent',
      );
    }
    row.status = AccountStatus.Inactive;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicAccount(row), 'Account deactivated');
  }

  async remove(id: string, actorId: string) {
    const row = await this.requireAccount(id);
    if (row.postingCount > 0) {
      throw new ConflictException(
        'Accounts with postings cannot be deleted',
      );
    }
    if (row.isSystem) {
      throw new BadRequestException('System accounts cannot be deleted');
    }
    const children = await this.accountModel
      .countDocuments({ parentAccountId: row._id })
      .exec();
    if (children > 0) {
      throw new BadRequestException(
        'Move or delete child accounts before deleting this account',
      );
    }

    await row.softDelete(new Types.ObjectId(actorId));
    return createSuccessResponse(
      { id: String(row._id) },
      'Account deleted',
    );
  }

  async getById(id: string) {
    const row = await this.requireAccount(id);
    return createSuccessResponse(toPublicAccount(row));
  }

  async getByCode(accountCode: string) {
    const row = await this.accountModel
      .findOne({ accountCode: accountCode.trim().toUpperCase() })
      .exec();
    if (!row) {
      throw new NotFoundException('Account not found');
    }
    return createSuccessResponse(toPublicAccount(row));
  }

  async list(query: ListAccountsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter: FilterQuery<Account> = {};

    if (query.accountType) filter.accountType = query.accountType;
    if (query.accountCategory) filter.accountCategory = query.accountCategory;
    if (query.status) filter.status = query.status;
    if (query.parentAccountId) {
      filter.parentAccountId = new Types.ObjectId(query.parentAccountId);
    }
    if (query.rootsOnly) {
      filter.parentAccountId = null;
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      filter.$or = [
        { accountCode: new RegExp(q, 'i') },
        { accountName: new RegExp(q, 'i') },
      ];
    }

    const sort: Record<string, SortOrder> = { accountCode: 1 };
    const [rows, total] = await Promise.all([
      this.accountModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.accountModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => toPublicAccount(r)),
      'Accounts',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getTree(status?: AccountStatus) {
    const filter: FilterQuery<Account> = {};
    if (status) filter.status = status;

    const rows = await this.accountModel
      .find(filter)
      .sort({ accountCode: 1 })
      .exec();

    const tree = buildAccountTree(rows.map((r) => toPublicAccount(r)));
    return createSuccessResponse(tree, 'Account tree');
  }

  /**
   * Idempotent seed of the standard construction chart of accounts.
   */
  async seedStandard(actorId?: string) {
    const codeToId = new Map<string, Types.ObjectId>();
    const codeToLevel = new Map<string, number>();
    let created = 0;
    let skipped = 0;

    const existing = await this.accountModel.find({}).lean().exec();
    for (const row of existing) {
      codeToId.set(row.accountCode, row._id as Types.ObjectId);
      codeToLevel.set(row.accountCode, row.level);
    }

    for (const def of STANDARD_CONSTRUCTION_COA) {
      if (codeToId.has(def.accountCode)) {
        skipped += 1;
        continue;
      }

      let parentAccountId: Types.ObjectId | null = null;
      let level = 1;
      if (def.parentCode) {
        const parentId = codeToId.get(def.parentCode);
        const parentLevel = codeToLevel.get(def.parentCode);
        if (!parentId || parentLevel == null) {
          throw new BadRequestException(
            `Seed parent ${def.parentCode} missing for ${def.accountCode}`,
          );
        }
        parentAccountId = parentId;
        level = parentLevel + 1;
      }

      const row = await this.accountModel.create({
        accountCode: def.accountCode,
        accountName: def.accountName,
        accountType: def.accountType,
        accountCategory: def.accountCategory,
        parentAccountId,
        level,
        isControlAccount: def.isControlAccount,
        allowManualPosting: def.allowManualPosting,
        requiresProject: def.requiresProject,
        requiresParty: def.requiresParty,
        status: AccountStatus.Active,
        postingCount: 0,
        isSystem: true,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });

      codeToId.set(def.accountCode, row._id as Types.ObjectId);
      codeToLevel.set(def.accountCode, level);
      created += 1;
    }

    return createSuccessResponse(
      { created, skipped, total: STANDARD_CONSTRUCTION_COA.length },
      created > 0
        ? 'Standard construction chart of accounts seeded'
        : 'Standard chart of accounts already present',
    );
  }

  /** Journal module: reject manual lines on locked control accounts */
  async assertAllowsManualPosting(accountId: string): Promise<Account> {
    const row = await this.requireAccount(accountId);
    if (row.status !== AccountStatus.Active) {
      throw new BadRequestException('Account is inactive');
    }
    if (row.isControlAccount && !row.allowManualPosting) {
      throw new BadRequestException(
        'Control accounts cannot accept manual postings unless configured',
      );
    }
    if (!row.allowManualPosting) {
      throw new BadRequestException(
        'This account does not allow manual posting',
      );
    }
    return row;
  }

  /** Journal module: bump posting presence so delete stays blocked */
  async incrementPostingCount(
    accountId: string,
    by = 1,
    session?: ClientSession | null,
  ): Promise<void> {
    if (by < 1) return;
    await this.accountModel
      .updateOne(
        { _id: new Types.ObjectId(accountId) },
        { $inc: { postingCount: by } },
        session ? { session } : undefined,
      )
      .exec();
  }

  // ─── internals ─────────────────────────────────────────────────────────

  private async assertCodeAvailable(accountCode: string) {
    const existing = await this.accountModel
      .findOne({ accountCode })
      .setOptions({ withDeleted: true })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(`Account code ${accountCode} already exists`);
    }
  }

  private async resolveParent(
    parentAccountId: string | null | undefined,
    accountType: Account['accountType'],
    movingId?: string,
  ): Promise<{ parentAccountId: Types.ObjectId | null; level: number }> {
    if (!parentAccountId) {
      return { parentAccountId: null, level: 1 };
    }

    const parent = await this.requireAccount(parentAccountId);
    if (parent.accountType !== accountType) {
      throw new BadRequestException(
        'Child account type must match parent account type',
      );
    }
    if (movingId && String(parent._id) === movingId) {
      throw new BadRequestException('Account cannot be its own parent');
    }
    if (movingId) {
      await this.assertNotDescendant(movingId, String(parent._id));
    }

    return {
      parentAccountId: parent._id as Types.ObjectId,
      level: parent.level + 1,
    };
  }

  private async assertNotDescendant(
    accountId: string,
    candidateParentId: string,
  ) {
    let currentId: string | null = candidateParentId;
    const guard = new Set<string>();
    while (currentId) {
      if (currentId === accountId) {
        throw new BadRequestException(
          'Cannot move an account under one of its descendants',
        );
      }
      if (guard.has(currentId)) break;
      guard.add(currentId);
      const node = await this.accountModel.findById(currentId).lean().exec();
      currentId = node?.parentAccountId ? String(node.parentAccountId) : null;
    }
  }

  private async relevelDescendants(accountId: string, parentLevel: number) {
    const children = await this.accountModel
      .find({ parentAccountId: new Types.ObjectId(accountId) })
      .exec();
    for (const child of children) {
      child.level = parentLevel + 1;
      await child.save();
      await this.relevelDescendants(String(child._id), child.level);
    }
  }

  private async requireAccount(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Account not found');
    }
    const row = await this.accountModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Account not found');
    }
    return row;
  }
}
