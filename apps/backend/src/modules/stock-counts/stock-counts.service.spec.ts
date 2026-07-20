import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { DatabaseService } from '../../database/services/database.service';
import { withTransaction } from '../../database/utils/transaction.helper';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import type { JournalService } from '../journal/journal.service';
import {
  Material,
  MaterialSchema,
  MaterialStatus,
  MaterialUnit,
} from '../material-master/schemas/material.schema';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
  StockTransactionType,
} from '../material-master/schemas/material-stock-transaction.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import type { PermissionsService } from '../rbac/permissions.service';
import {
  MaterialStockBalance,
  MaterialStockBalanceSchema,
} from '../stock-ledger/schemas/material-stock-balance.schema';
import { StockLedgerService } from '../stock-ledger/stock-ledger.service';
import { StockCount, StockCountSchema, StockCountStatus } from './schemas/stock-count.schema';
import { StockCountsService } from './stock-counts.service';

describe('StockCountsService', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let countModel: Model<StockCount>;
  let materialModel: Model<Material>;
  let accountModel: Model<Account>;
  let stockLedgerService: StockLedgerService;
  let service: StockCountsService;
  let projectId: string;
  let materialId: string;
  let actorId: string;
  let directorId: string;
  let permissions: {
    resolveUserAccess: jest.Mock;
  };
  let journalCreate: jest.Mock;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const mongoose = await connect(replSet.getUri());
    connection = mongoose.connection;

    countModel = connection.model(
      StockCount.name,
      StockCountSchema,
    ) as Model<StockCount>;
    materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    const ledgerModel = connection.model(
      MaterialStockTransaction.name,
      MaterialStockTransactionSchema,
    ) as Model<MaterialStockTransaction>;
    const balanceModel = connection.model(
      MaterialStockBalance.name,
      MaterialStockBalanceSchema,
    ) as Model<MaterialStockBalance>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      countModel.syncIndexes(),
      materialModel.syncIndexes(),
      accountModel.syncIndexes(),
      ledgerModel.syncIndexes(),
      balanceModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const databaseService = {
      withTransaction: (work: Parameters<typeof withTransaction>[1]) =>
        withTransaction(connection, work),
    } as DatabaseService;

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'stockAllowNegative') return false;
        if (key === 'stockCountDirectorThresholdPercent') return 10;
        return undefined;
      }),
    } as unknown as ConfigService<never, true>;

    stockLedgerService = new StockLedgerService(
      ledgerModel,
      balanceModel,
      materialModel,
      new NumberingService(counterModel),
      databaseService,
      configService,
    );

    permissions = {
      resolveUserAccess: jest.fn(),
    };

    journalCreate = jest.fn().mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });

    service = new StockCountsService(
      countModel,
      materialModel,
      accountModel,
      new NumberingService(counterModel),
      stockLedgerService,
      { create: journalCreate } as unknown as JournalService,
      permissions as unknown as PermissionsService,
      configService,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (replSet) await replSet.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    directorId = new Types.ObjectId().toHexString();
    projectId = new Types.ObjectId().toHexString();
    journalCreate.mockClear();
    permissions.resolveUserAccess.mockReset();
    permissions.resolveUserAccess.mockResolvedValue({
      bypassPermissions: false,
      permissions: ['stock.adjust', 'stock.view'],
      roleCodes: ['STOREKEEPER'],
      roleIds: [],
      userId: actorId,
    });

    await countModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(MaterialStockTransaction.name)
      .collection.deleteMany({});
    await connection.model(MaterialStockBalance.name).deleteMany({});
    await materialModel.deleteMany({}).setOptions({ withDeleted: true });
    await accountModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [material] = await materialModel.create([
      {
        materialCode: 'MAT-000001',
        name: 'Cement',
        category: 'cement',
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [],
        conversionFactors: [],
        standardRate: 400,
        minimumStock: 0,
        reorderLevel: 0,
        maximumStock: 0,
        standardWastagePercentage: 0,
        ledgerAccountId: new Types.ObjectId(),
        status: MaterialStatus.Active,
      },
    ]);
    materialId = String(material._id);

    await accountModel.create([
      {
        accountCode: '1150',
        accountName: 'Work in Progress',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.WorkInProgress,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '5100',
        accountName: 'Direct Expense',
        accountType: AccountType.Expense,
        accountCategory: AccountCategory.DirectExpense,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '4200',
        accountName: 'Other Income',
        accountType: AccountType.Income,
        accountCategory: AccountCategory.OtherIncome,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
    ]);

    await stockLedgerService.postEntry({
      projectId,
      materialId,
      transactionType: StockTransactionType.OpeningStock,
      quantityIn: 100,
      quantityOut: 0,
      unit: MaterialUnit.Bag,
      referenceType: 'opening',
      transactionDate: '2026-07-01',
      actorId,
    });
  });

  async function createSubmitted(physical: number, reason?: string) {
    const created = await service.create(
      {
        projectId,
        countDate: '2026-07-17',
        items: [
          {
            materialId,
            physicalQuantity: physical,
            reason: reason ?? (physical === 100 ? undefined : 'Count variance'),
          },
        ],
      },
      actorId,
    );
    return service.submit(created.data!.id, actorId);
  }

  it('runs Draft → Submitted → Reviewed → Approved → Adjustment Posted', async () => {
    const submitted = await createSubmitted(95, 'Bags torn');
    expect(submitted.data?.status).toBe(StockCountStatus.Submitted);
    expect(submitted.data?.items[0]?.difference).toBe(-5);
    expect(submitted.data?.requiresDirectorApproval).toBe(false);

    const reviewed = await service.review(submitted.data!.id, actorId);
    expect(reviewed.data?.status).toBe(StockCountStatus.Reviewed);

    const approved = await service.approve(reviewed.data!.id, actorId);
    expect(approved.data?.status).toBe(StockCountStatus.Approved);

    const posted = await service.post(approved.data!.id, actorId);
    expect(posted.data?.status).toBe(StockCountStatus.AdjustmentPosted);
    expect(posted.data?.journalEntryId).toBeTruthy();
    expect(journalCreate).toHaveBeenCalled();

    const balance = await stockLedgerService.getQuantityInBaseUnit({
      projectId,
      materialId,
    });
    expect(balance).toBe(95);
  });

  it('rejects difference without reason', async () => {
    await expect(
      service.create(
        {
          projectId,
          countDate: '2026-07-17',
          items: [{ materialId, physicalQuantity: 90 }],
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires director approval for large variances', async () => {
    const submitted = await createSubmitted(80, 'Major shortage');
    expect(submitted.data?.requiresDirectorApproval).toBe(true);
    expect(submitted.data?.items[0]?.isLargeVariance).toBe(true);

    await service.review(submitted.data!.id, actorId);

    await expect(
      service.approve(submitted.data!.id, actorId),
    ).rejects.toBeInstanceOf(ForbiddenException);

    permissions.resolveUserAccess.mockResolvedValue({
      bypassPermissions: false,
      permissions: ['stock.view', 'stock.count.director_approve'],
      roleCodes: ['DIRECTOR'],
      roleIds: [],
      userId: directorId,
    });

    const approved = await service.approve(submitted.data!.id, directorId);
    expect(approved.data?.status).toBe(StockCountStatus.Approved);
  });
});
