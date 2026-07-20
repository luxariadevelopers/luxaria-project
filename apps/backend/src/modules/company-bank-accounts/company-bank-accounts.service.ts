import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, PipelineStage, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import {
  decryptSensitive,
  encryptSensitive,
} from '../../common/utils/crypto.util';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import type { AppConfig } from '../../config/configuration';
import {
  Account,
  AccountCategory,
  AccountStatus,
} from '../chart-of-accounts/schemas/account.schema';
import {
  JournalEntry,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { Project } from '../projects/schemas/project.schema';
import { PermissionsService } from '../rbac/permissions.service';
import {
  type BankBalanceView,
  type BankLedgerLine,
  toPublicBankAccount,
} from './company-bank-accounts.mapper';
import {
  assertOpeningBalance,
  assertValidAccountNumber,
  assertValidIfsc,
  buildMaskedAccountNumber,
  normalizeAccountNumber,
} from './company-bank-accounts.validation';
import type {
  BankLedgerQueryDto,
  CreateCompanyBankAccountDto,
  ListCompanyBankAccountsQueryDto,
  SetDefaultBankAccountDto,
  UpdateCompanyBankAccountDto,
} from './dto/company-bank-account.dto';
import {
  BankAccountStatus,
  CompanyBankAccount,
} from './schemas/company-bank-account.schema';

@Injectable()
export class CompanyBankAccountsService {
  constructor(
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(JournalEntry.name)
    private readonly journalModel: Model<JournalEntry>,
    private readonly numberingService: NumberingService,
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async create(dto: CreateCompanyBankAccountDto, actorId: string) {
    await this.assertLedgerAccount(dto.ledgerAccountId);
    if (dto.projectId) {
      await this.assertProject(dto.projectId);
    }

    const ifsc = dto.ifsc.trim().toUpperCase();
    assertValidIfsc(ifsc);
    assertValidAccountNumber(dto.accountNumber);
    const plain = normalizeAccountNumber(dto.accountNumber);
    const openingBalance = dto.openingBalance ?? 0;
    assertOpeningBalance(openingBalance);

    const accountCode = await this.numberingService.nextCode(
      NumberEntityType.BANK_ACCOUNT,
    );

    const isDefault = Boolean(dto.isDefault);
    if (isDefault) {
      await this.clearDefault(dto.projectId ?? null);
    }

    const row = await this.bankModel.create({
      accountCode,
      bankName: dto.bankName.trim(),
      branch: dto.branch?.trim() ?? null,
      accountHolderName: dto.accountHolderName.trim(),
      maskedAccountNumber: buildMaskedAccountNumber(plain),
      encryptedAccountNumber: encryptSensitive(plain, this.encryptionKey()),
      ifsc,
      accountType: dto.accountType,
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      ledgerAccountId: new Types.ObjectId(dto.ledgerAccountId),
      openingBalance,
      status: BankAccountStatus.Active,
      isDefault,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicBankAccount(row, null),
      'Company bank account created',
    );
  }

  async update(
    id: string,
    dto: UpdateCompanyBankAccountDto,
    actorId: string,
  ) {
    const row = await this.requireBank(id, true);

    if (dto.ledgerAccountId !== undefined) {
      await this.assertLedgerAccount(dto.ledgerAccountId);
      row.ledgerAccountId = new Types.ObjectId(dto.ledgerAccountId);
    }
    if (dto.projectId !== undefined) {
      if (dto.projectId) {
        await this.assertProject(dto.projectId);
        row.projectId = new Types.ObjectId(dto.projectId);
      } else {
        row.projectId = null;
      }
    }
    if (dto.bankName !== undefined) row.bankName = dto.bankName.trim();
    if (dto.branch !== undefined) row.branch = dto.branch?.trim() ?? null;
    if (dto.accountHolderName !== undefined) {
      row.accountHolderName = dto.accountHolderName.trim();
    }
    if (dto.ifsc !== undefined) {
      const ifsc = dto.ifsc.trim().toUpperCase();
      assertValidIfsc(ifsc);
      row.ifsc = ifsc;
    }
    if (dto.accountType !== undefined) row.accountType = dto.accountType;
    if (dto.openingBalance !== undefined) {
      assertOpeningBalance(dto.openingBalance);
      row.openingBalance = dto.openingBalance;
    }
    if (dto.accountNumber !== undefined) {
      assertValidAccountNumber(dto.accountNumber);
      const plain = normalizeAccountNumber(dto.accountNumber);
      row.encryptedAccountNumber = encryptSensitive(
        plain,
        this.encryptionKey(),
      );
      row.maskedAccountNumber = buildMaskedAccountNumber(plain);
    }
    if (dto.isDefault === true) {
      await this.clearDefault(
        row.projectId ? String(row.projectId) : null,
        String(row._id),
      );
      row.isDefault = true;
    } else if (dto.isDefault === false) {
      row.isDefault = false;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicBankAccount(row, null),
      'Company bank account updated',
    );
  }

  async activate(id: string, actorId: string) {
    const row = await this.requireBank(id);
    row.status = BankAccountStatus.Active;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicBankAccount(row, null),
      'Bank account activated',
    );
  }

  async deactivate(id: string, actorId: string) {
    const row = await this.requireBank(id);
    row.status = BankAccountStatus.Inactive;
    row.isDefault = false;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicBankAccount(row, null),
      'Bank account deactivated',
    );
  }

  async setDefault(
    id: string,
    actorId: string,
    dto: SetDefaultBankAccountDto = {},
  ) {
    const row = await this.requireBank(id);
    if (row.status !== BankAccountStatus.Active) {
      throw new BadRequestException(
        'Only active bank accounts can be set as default',
      );
    }

    const projectId =
      dto.projectId !== undefined
        ? dto.projectId
        : row.projectId
          ? String(row.projectId)
          : null;

    if (projectId) {
      await this.assertProject(projectId);
      row.projectId = new Types.ObjectId(projectId);
    } else if (dto.projectId === null) {
      row.projectId = null;
    }

    await this.clearDefault(
      row.projectId ? String(row.projectId) : null,
      String(row._id),
    );
    row.isDefault = true;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicBankAccount(row, null),
      projectId
        ? 'Default project bank account assigned'
        : 'Default company bank account assigned',
    );
  }

  async getById(id: string, actorId: string) {
    const canSensitive = await this.canViewSensitive(actorId);
    const row = await this.requireBank(id, canSensitive);
    const accountNumber = canSensitive
      ? this.safeDecrypt(row.encryptedAccountNumber)
      : null;
    return createSuccessResponse(toPublicBankAccount(row, accountNumber));
  }

  async list(query: ListCompanyBankAccountsQueryDto, actorId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<CompanyBankAccount> = {};

    if (query.status) filter.status = query.status;
    if (query.companyOnly) {
      filter.projectId = null;
    } else if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      filter.$or = [
        { accountCode: new RegExp(q, 'i') },
        { bankName: new RegExp(q, 'i') },
        { ifsc: new RegExp(q, 'i') },
        { maskedAccountNumber: new RegExp(q.slice(-4), 'i') },
        { accountHolderName: new RegExp(q, 'i') },
      ];
    }

    const sort: Record<string, SortOrder> = { accountCode: 1 };
    const [rows, total] = await Promise.all([
      this.bankModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.bankModel.countDocuments(filter).exec(),
    ]);

    // List never returns decrypted account numbers
    void actorId;
    return createSuccessResponse(
      rows.map((r) => toPublicBankAccount(r, null)),
      'Company bank accounts',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getBalance(id: string): Promise<ReturnType<typeof createSuccessResponse<BankBalanceView>>> {
    const row = await this.requireBank(id);
    const totals = await this.sumLedgerMovements(String(row.ledgerAccountId));
    const currentBalance =
      Math.round(
        (row.openingBalance + totals.totalDebit - totals.totalCredit) * 100,
      ) / 100;

    return createSuccessResponse(
      {
        bankAccountId: String(row._id),
        accountCode: row.accountCode,
        ledgerAccountId: String(row.ledgerAccountId),
        openingBalance: row.openingBalance,
        totalDebit: totals.totalDebit,
        totalCredit: totals.totalCredit,
        currentBalance,
        asOf: new Date(),
      },
      'Bank account balance',
    );
  }

  async getLedger(id: string, query: BankLedgerQueryDto) {
    const row = await this.requireBank(id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const ledgerAccountId = row.ledgerAccountId;

    const match: FilterQuery<JournalEntry> = {
      status: JournalStatus.Posted,
      'lines.accountId': ledgerAccountId,
    };
    if (query.from || query.to) {
      match.journalDate = {};
      if (query.from) {
        (match.journalDate as Record<string, Date>).$gte = new Date(query.from);
      }
      if (query.to) {
        (match.journalDate as Record<string, Date>).$lte = new Date(query.to);
      }
    }

    const pipeline = [
      { $match: match },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.accountId': ledgerAccountId,
        },
      },
      { $sort: { journalDate: 1 as const, createdAt: 1 as const, _id: 1 as const } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          rows: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                journalId: '$_id',
                journalNumber: 1,
                journalDate: 1,
                narration: 1,
                lineId: '$lines._id',
                debit: '$lines.debit',
                credit: '$lines.credit',
                description: '$lines.description',
                projectId: '$lines.projectId',
              },
            },
          ],
        },
      },
    ];

    const [facet] = await this.journalModel.aggregate(pipeline).exec();
    const total = facet?.total?.[0]?.count ?? 0;
    const lines: BankLedgerLine[] = (facet?.rows ?? []).map(
      (r: {
        journalId: Types.ObjectId;
        journalNumber: string;
        journalDate: Date;
        narration: string;
        lineId: Types.ObjectId;
        debit: number;
        credit: number;
        description?: string | null;
        projectId?: Types.ObjectId | null;
      }) => ({
        journalId: String(r.journalId),
        journalNumber: r.journalNumber,
        journalDate: r.journalDate,
        narration: r.narration,
        lineId: String(r.lineId),
        debit: r.debit,
        credit: r.credit,
        description: r.description ?? null,
        projectId: r.projectId ? String(r.projectId) : null,
      }),
    );

    // Running balance from opening through prior pages + current page
    const priorNet = await this.sumLedgerMovements(
      String(ledgerAccountId),
      query.from,
      query.to,
      (page - 1) * limit,
    );
    let running =
      Math.round(
        (row.openingBalance + priorNet.totalDebit - priorNet.totalCredit) * 100,
      ) / 100;
    for (const line of lines) {
      running =
        Math.round((running + line.debit - line.credit) * 100) / 100;
      line.runningBalance = running;
    }

    return createSuccessResponse(lines, 'Bank transaction ledger', {
      ...buildPaginationMeta(page, limit, total),
      bankAccountId: String(row._id),
      accountCode: row.accountCode,
      openingBalance: row.openingBalance,
    });
  }

  // ─── internals ─────────────────────────────────────────────────────────

  private encryptionKey(): string {
    return (
      this.configService.getOrThrow<AppConfig['fieldEncryptionKey']>(
        'fieldEncryptionKey',
      )
    );
  }

  private async canViewSensitive(actorId: string): Promise<boolean> {
    const access = await this.permissionsService.resolveUserAccess(actorId);
    if (access.bypassPermissions) return true;
    return (
      access.permissions.includes('bank.view_sensitive') ||
      access.permissions.includes('bank.manage')
    );
  }

  private safeDecrypt(encrypted: string | null | undefined): string | null {
    if (!encrypted) return null;
    try {
      return decryptSensitive(encrypted, this.encryptionKey());
    } catch {
      return null;
    }
  }

  private async assertLedgerAccount(ledgerAccountId: string) {
    if (!Types.ObjectId.isValid(ledgerAccountId)) {
      throw new BadRequestException('Invalid ledgerAccountId');
    }
    const account = await this.accountModel.findById(ledgerAccountId).exec();
    if (!account) {
      throw new BadRequestException('Ledger account not found');
    }
    if (account.status !== AccountStatus.Active) {
      throw new BadRequestException('Ledger account is inactive');
    }
    if (account.accountCategory !== AccountCategory.Bank) {
      throw new BadRequestException(
        'ledgerAccountId must reference a Bank category chart account',
      );
    }
    if (account.isControlAccount && !account.allowManualPosting) {
      throw new BadRequestException(
        'Control ledger accounts cannot be linked as bank ledgers',
      );
    }
  }

  private async assertProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel
      .findById(projectId)
      .select('_id')
      .lean()
      .exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private async clearDefault(
    projectId: string | null,
    excludeId?: string,
  ): Promise<void> {
    const filter: FilterQuery<CompanyBankAccount> = {
      isDefault: true,
      projectId: projectId ? new Types.ObjectId(projectId) : null,
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    await this.bankModel.updateMany(filter, { $set: { isDefault: false } }).exec();
  }

  private async sumLedgerMovements(
    ledgerAccountId: string,
    from?: string,
    to?: string,
    limitLines?: number,
  ): Promise<{ totalDebit: number; totalCredit: number }> {
    const match: Record<string, unknown> = {
      status: JournalStatus.Posted,
      'lines.accountId': new Types.ObjectId(ledgerAccountId),
    };
    if (from || to) {
      match.journalDate = {};
      if (from) (match.journalDate as Record<string, Date>).$gte = new Date(from);
      if (to) (match.journalDate as Record<string, Date>).$lte = new Date(to);
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.accountId': new Types.ObjectId(ledgerAccountId),
        },
      },
      { $sort: { journalDate: 1, createdAt: 1, _id: 1 } },
    ];

    if (typeof limitLines === 'number' && limitLines > 0) {
      pipeline.push({ $limit: limitLines });
    } else if (limitLines === 0) {
      return { totalDebit: 0, totalCredit: 0 };
    }

    pipeline.push({
      $group: {
        _id: null,
        totalDebit: { $sum: '$lines.debit' },
        totalCredit: { $sum: '$lines.credit' },
      },
    });

    const [agg] = await this.journalModel.aggregate(pipeline).exec();
    return {
      totalDebit: Math.round((agg?.totalDebit ?? 0) * 100) / 100,
      totalCredit: Math.round((agg?.totalCredit ?? 0) * 100) / 100,
    };
  }

  private async requireBank(id: string, withEncrypted = false) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Bank account not found');
    }
    let q = this.bankModel.findById(id);
    if (withEncrypted) {
      q = q.select('+encryptedAccountNumber');
    }
    const row = await q.exec();
    if (!row) {
      throw new NotFoundException('Bank account not found');
    }
    return row;
  }
}
