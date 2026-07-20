import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, PipelineStage, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
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
import { User, UserStatus } from '../users/schemas/user.schema';
import {
  type CashBalanceView,
  type CashLedgerLine,
  toPublicCashAccount,
} from './cash-accounts.mapper';
import type {
  AssignCustodianDto,
  CashLedgerQueryDto,
  CloseCashAccountDto,
  ConfirmHandoverDto,
  CreateCashAccountDto,
  InitiateCustodianTransferDto,
  ListCashAccountsQueryDto,
} from './dto/cash-account.dto';
import {
  CashAccount,
  type CashAccountDocument,
  CashAccountKind,
  CashAccountStatus,
} from './schemas/cash-account.schema';

const MONEY_EPS = 0.005;

@Injectable()
export class CashAccountsService {
  constructor(
    @InjectModel(CashAccount.name)
    private readonly cashModel: Model<CashAccount>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(JournalEntry.name)
    private readonly journalModel: Model<JournalEntry>,
    private readonly numberingService: NumberingService,
  ) {}

  async create(dto: CreateCashAccountDto, actorId: string) {
    await this.assertProject(dto.projectId);
    await this.assertActiveUser(dto.custodianUserId);
    await this.assertLedgerAccount(dto.ledgerAccountId, dto.kind);
    this.assertLimits(dto.maximumHoldingLimit, dto.replenishmentLevel);

    const openingBalance = dto.openingBalance ?? 0;
    if (openingBalance < -MONEY_EPS) {
      throw new BadRequestException(
        'openingBalance cannot be negative',
      );
    }
    if (openingBalance - dto.maximumHoldingLimit > MONEY_EPS) {
      throw new BadRequestException(
        'openingBalance cannot exceed maximumHoldingLimit',
      );
    }

    // Petty cash / site cash must start with an active custodian
    if (!dto.custodianUserId) {
      throw new BadRequestException(
        'A site cash / petty-cash account must have one active custodian',
      );
    }

    const accountCode = await this.numberingService.nextCode(
      NumberEntityType.CASH_ACCOUNT,
      { projectId: dto.projectId, projectScoped: true },
    );

    const row = await this.cashModel.create({
      accountCode,
      accountName: dto.accountName.trim(),
      kind: dto.kind,
      projectId: new Types.ObjectId(dto.projectId),
      custodianUserId: new Types.ObjectId(dto.custodianUserId),
      ledgerAccountId: new Types.ObjectId(dto.ledgerAccountId),
      maximumHoldingLimit: dto.maximumHoldingLimit,
      replenishmentLevel: dto.replenishmentLevel,
      openingBalance,
      status: CashAccountStatus.Active,
      pendingHandover: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicCashAccount(row),
      'Site cash account created',
    );
  }

  /**
   * Direct assign only when no pending handover and account is active.
   * Prefer transferCustodian + dual confirmation for changes.
   */
  async assignCustodian(
    id: string,
    dto: AssignCustodianDto,
    actorId: string,
  ) {
    const row = await this.requireCash(id);
    this.assertNotClosed(row);
    if (row.pendingHandover) {
      throw new ConflictException(
        'Complete or cancel the pending custodian handover first',
      );
    }
    if (String(row.custodianUserId) === dto.custodianUserId) {
      return createSuccessResponse(
        toPublicCashAccount(row),
        'Custodian unchanged',
      );
    }

    // Changing an existing custodian must go through handover confirmation
    if (row.custodianUserId) {
      throw new BadRequestException(
        'Custodian changes require handover confirmation; use transfer-custodian',
      );
    }

    await this.assertActiveUser(dto.custodianUserId);
    row.custodianUserId = new Types.ObjectId(dto.custodianUserId);
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCashAccount(row),
      'Custodian assigned',
    );
  }

  async initiateCustodianTransfer(
    id: string,
    dto: InitiateCustodianTransferDto,
    actorId: string,
  ) {
    const row = await this.requireCash(id);
    this.assertNotClosed(row);
    if (row.status === CashAccountStatus.PendingHandover || row.pendingHandover) {
      throw new ConflictException('A custodian handover is already pending');
    }
    if (!row.custodianUserId) {
      throw new BadRequestException(
        'Account has no active custodian to transfer from',
      );
    }
    if (String(row.custodianUserId) === dto.toUserId) {
      throw new BadRequestException(
        'Incoming custodian must be different from the current custodian',
      );
    }

    await this.assertActiveUser(dto.toUserId);

    const balance = await this.computeBalance(row);
    if (dto.declaredBalance != null) {
      if (Math.abs(dto.declaredBalance - balance.currentBalance) > 1) {
        throw new BadRequestException(
          `declaredBalance (${dto.declaredBalance}) differs from system balance (${balance.currentBalance}) by more than ₹1`,
        );
      }
    }

    row.pendingHandover = {
      fromUserId: row.custodianUserId,
      toUserId: new Types.ObjectId(dto.toUserId),
      initiatedBy: new Types.ObjectId(actorId),
      initiatedAt: new Date(),
      outgoingConfirmedAt: null,
      outgoingConfirmedBy: null,
      incomingConfirmedAt: null,
      incomingConfirmedBy: null,
      declaredBalance: dto.declaredBalance ?? balance.currentBalance,
      notes: dto.notes?.trim() ?? null,
    };
    row.status = CashAccountStatus.PendingHandover;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicCashAccount(row),
      'Custodian handover initiated — awaiting confirmations',
    );
  }

  async confirmHandover(
    id: string,
    actorId: string,
    dto: ConfirmHandoverDto = {},
  ) {
    const row = await this.requireCash(id);
    if (
      row.status !== CashAccountStatus.PendingHandover ||
      !row.pendingHandover
    ) {
      throw new BadRequestException('No pending custodian handover');
    }

    const handover = row.pendingHandover;
    const isOutgoing = String(handover.fromUserId) === actorId;
    const isIncoming = String(handover.toUserId) === actorId;

    if (!isOutgoing && !isIncoming) {
      throw new ForbiddenException(
        'Only the outgoing or incoming custodian can confirm handover',
      );
    }

    const now = new Date();
    if (isOutgoing) {
      if (handover.outgoingConfirmedAt) {
        throw new ConflictException('Outgoing custodian already confirmed');
      }
      handover.outgoingConfirmedAt = now;
      handover.outgoingConfirmedBy = new Types.ObjectId(actorId);
    }
    if (isIncoming) {
      if (handover.incomingConfirmedAt) {
        throw new ConflictException('Incoming custodian already confirmed');
      }
      handover.incomingConfirmedAt = now;
      handover.incomingConfirmedBy = new Types.ObjectId(actorId);
    }
    if (dto.notes?.trim()) {
      handover.notes = [handover.notes, dto.notes.trim()]
        .filter(Boolean)
        .join(' | ');
    }

    row.pendingHandover = handover;
    row.markModified('pendingHandover');

    if (handover.outgoingConfirmedAt && handover.incomingConfirmedAt) {
      row.custodianUserId = handover.toUserId;
      row.pendingHandover = null;
      row.status = CashAccountStatus.Active;
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save();
      return createSuccessResponse(
        toPublicCashAccount(row),
        'Custodian handover completed',
      );
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCashAccount(row),
      isOutgoing
        ? 'Outgoing custodian confirmed — awaiting incoming confirmation'
        : 'Incoming custodian confirmed — awaiting outgoing confirmation',
    );
  }

  async cancelHandover(id: string, actorId: string) {
    const row = await this.requireCash(id);
    if (!row.pendingHandover) {
      throw new BadRequestException('No pending custodian handover');
    }
    const h = row.pendingHandover;
    const allowed =
      String(h.initiatedBy) === actorId ||
      String(h.fromUserId) === actorId;
    if (!allowed) {
      throw new ForbiddenException(
        'Only the initiator or outgoing custodian can cancel handover',
      );
    }
    row.pendingHandover = null;
    row.status = CashAccountStatus.Active;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCashAccount(row),
      'Custodian handover cancelled',
    );
  }

  async close(id: string, actorId: string, dto: CloseCashAccountDto = {}) {
    const row = await this.requireCash(id);
    this.assertNotClosed(row);
    if (row.pendingHandover) {
      throw new ConflictException(
        'Resolve pending custodian handover before closing',
      );
    }

    const balance = await this.computeBalance(row);
    if (Math.abs(balance.currentBalance) > MONEY_EPS) {
      throw new BadRequestException(
        `Cannot close cash account with non-zero balance (${balance.currentBalance})`,
      );
    }

    row.status = CashAccountStatus.Closed;
    row.closedAt = new Date();
    row.closedBy = new Types.ObjectId(actorId);
    row.closeReason = dto.reason?.trim() ?? null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(toPublicCashAccount(row), 'Cash account closed');
  }

  async getById(id: string) {
    const row = await this.requireCash(id);
    return createSuccessResponse(toPublicCashAccount(row));
  }

  async list(query: ListCashAccountsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<CashAccount> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.kind) filter.kind = query.kind;
    if (query.status) filter.status = query.status;
    if (query.custodianUserId) {
      filter.custodianUserId = new Types.ObjectId(query.custodianUserId);
    }

    const sort: Record<string, SortOrder> = { accountCode: 1 };
    const [rows, total] = await Promise.all([
      this.cashModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.cashModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => toPublicCashAccount(r)),
      'Cash accounts',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getBalance(id: string) {
    const row = await this.requireCash(id);
    const view = await this.computeBalance(row);
    return createSuccessResponse(view, 'Cash account balance');
  }

  async getLedger(id: string, query: CashLedgerQueryDto) {
    const row = await this.requireCash(id);
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

    const [facet] = await this.journalModel
      .aggregate([
        { $match: match },
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': ledgerAccountId } },
        {
          $sort: {
            journalDate: 1 as const,
            createdAt: 1 as const,
            _id: 1 as const,
          },
        },
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
                },
              },
            ],
          },
        },
      ])
      .exec();

    const total = facet?.total?.[0]?.count ?? 0;
    const prior = await this.sumLedgerMovements(
      String(ledgerAccountId),
      (page - 1) * limit,
    );
    let running =
      Math.round(
        (row.openingBalance + prior.totalDebit - prior.totalCredit) * 100,
      ) / 100;

    const lines: CashLedgerLine[] = (facet?.rows ?? []).map(
      (r: {
        journalId: Types.ObjectId;
        journalNumber: string;
        journalDate: Date;
        narration: string;
        lineId: Types.ObjectId;
        debit: number;
        credit: number;
        description?: string | null;
      }) => {
        running = Math.round((running + r.debit - r.credit) * 100) / 100;
        return {
          journalId: String(r.journalId),
          journalNumber: r.journalNumber,
          journalDate: r.journalDate,
          narration: r.narration,
          lineId: String(r.lineId),
          debit: r.debit,
          credit: r.credit,
          description: r.description ?? null,
          runningBalance: running,
        };
      },
    );

    return createSuccessResponse(lines, 'Cash ledger', {
      ...buildPaginationMeta(page, limit, total),
      cashAccountId: String(row._id),
      accountCode: row.accountCode,
      openingBalance: row.openingBalance,
    });
  }

  /**
   * Guard for expense / petty-cash disbursement modules.
   * Cash balance should not normally become negative.
   */
  async assertSufficientBalance(
    cashAccountId: string,
    amount: number,
  ): Promise<CashBalanceView> {
    if (amount < 0) {
      throw new BadRequestException('Disbursement amount must be non-negative');
    }
    const row = await this.requireCash(cashAccountId);
    this.assertNotClosed(row);
    if (row.status === CashAccountStatus.PendingHandover) {
      throw new BadRequestException(
        'Cannot disburse while custodian handover is pending',
      );
    }
    this.assertHasActiveCustodian(row);

    const balance = await this.computeBalance(row);
    if (balance.currentBalance - amount < -MONEY_EPS) {
      throw new BadRequestException(
        `Insufficient cash balance (${balance.currentBalance}) for amount ${amount}`,
      );
    }
    return balance;
  }

  // ─── internals ─────────────────────────────────────────────────────────

  private assertHasActiveCustodian(row: CashAccount) {
    if (!row.custodianUserId) {
      throw new BadRequestException(
        'A site petty-cash account must have one active custodian',
      );
    }
  }

  private assertNotClosed(row: CashAccount) {
    if (row.status === CashAccountStatus.Closed) {
      throw new BadRequestException('Cash account is closed');
    }
  }

  private assertLimits(max: number, replenishment: number) {
    if (max < 0 || replenishment < 0) {
      throw new BadRequestException('Limits must be non-negative');
    }
    if (replenishment - max > MONEY_EPS) {
      throw new BadRequestException(
        'replenishmentLevel cannot exceed maximumHoldingLimit',
      );
    }
  }

  private async computeBalance(row: CashAccountDocument): Promise<CashBalanceView> {
    const totals = await this.sumLedgerMovements(String(row.ledgerAccountId));
    const currentBalance =
      Math.round(
        (row.openingBalance + totals.totalDebit - totals.totalCredit) * 100,
      ) / 100;

    return {
      cashAccountId: String(row._id),
      accountCode: row.accountCode,
      ledgerAccountId: String(row.ledgerAccountId),
      openingBalance: row.openingBalance,
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit,
      currentBalance,
      maximumHoldingLimit: row.maximumHoldingLimit,
      replenishmentLevel: row.replenishmentLevel,
      needsReplenishment: currentBalance <= row.replenishmentLevel,
      isOverLimit: currentBalance - row.maximumHoldingLimit > MONEY_EPS,
      isNegative: currentBalance < -MONEY_EPS,
      asOf: new Date(),
    };
  }

  private async sumLedgerMovements(
    ledgerAccountId: string,
    limitLines?: number,
  ): Promise<{ totalDebit: number; totalCredit: number }> {
    if (limitLines === 0) {
      return { totalDebit: 0, totalCredit: 0 };
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: JournalStatus.Posted,
          'lines.accountId': new Types.ObjectId(ledgerAccountId),
        },
      },
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

  private async assertLedgerAccount(
    ledgerAccountId: string,
    kind: CashAccountKind,
  ) {
    const account = await this.accountModel.findById(ledgerAccountId).exec();
    if (!account) {
      throw new BadRequestException('Ledger account not found');
    }
    if (account.status !== AccountStatus.Active) {
      throw new BadRequestException('Ledger account is inactive');
    }
    const allowed =
      kind === CashAccountKind.PettyCash
        ? [AccountCategory.PettyCash, AccountCategory.Cash]
        : [AccountCategory.Cash, AccountCategory.PettyCash];
    if (!allowed.includes(account.accountCategory)) {
      throw new BadRequestException(
        `ledgerAccountId must be a Cash or Petty Cash chart account for ${kind}`,
      );
    }
    if (account.isControlAccount && !account.allowManualPosting) {
      throw new BadRequestException(
        'Control ledger accounts cannot be linked as cash ledgers',
      );
    }
  }

  private async assertProject(projectId: string) {
    const project = await this.projectModel
      .findById(projectId)
      .select('_id')
      .lean()
      .exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private async assertActiveUser(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('status')
      .lean()
      .exec();
    if (!user) {
      throw new NotFoundException('Custodian user not found');
    }
    if (user.status !== UserStatus.Active) {
      throw new BadRequestException('Custodian user must be active');
    }
  }

  private async requireCash(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Cash account not found');
    }
    const row = await this.cashModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Cash account not found');
    }
    return row;
  }
}
