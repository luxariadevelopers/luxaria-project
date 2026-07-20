import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { DatabaseService } from '../../database/services/database.service';
import { withTransaction } from '../../database/utils/transaction.helper';
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
import {
  MaterialStockBalance,
  MaterialStockBalanceSchema,
} from './schemas/material-stock-balance.schema';
import { StockLedgerService } from './stock-ledger.service';

describe('StockLedgerService', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let ledgerModel: Model<MaterialStockTransaction>;
  let balanceModel: Model<MaterialStockBalance>;
  let materialModel: Model<Material>;
  let service: StockLedgerService;
  let projectId: string;
  let materialId: string;
  let actorId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const mongoose = await connect(replSet.getUri());
    connection = mongoose.connection;

    ledgerModel = connection.model(
      MaterialStockTransaction.name,
      MaterialStockTransactionSchema,
    ) as Model<MaterialStockTransaction>;
    balanceModel = connection.model(
      MaterialStockBalance.name,
      MaterialStockBalanceSchema,
    ) as Model<MaterialStockBalance>;
    materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      ledgerModel.syncIndexes(),
      balanceModel.syncIndexes(),
      materialModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const databaseService = {
      withTransaction: (work: Parameters<typeof withTransaction>[1]) =>
        withTransaction(connection, work),
    } as DatabaseService;

    const configService = {
      get: jest.fn().mockReturnValue(false),
    } as unknown as ConfigService<never, true>;

    service = new StockLedgerService(
      ledgerModel,
      balanceModel,
      materialModel,
      new NumberingService(counterModel),
      databaseService,
      configService,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (replSet) await replSet.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    projectId = new Types.ObjectId().toHexString();

    await ledgerModel.collection.deleteMany({});
    await balanceModel.deleteMany({});
    await materialModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [material] = await materialModel.create([
      {
        materialCode: 'MAT-000001',
        name: 'Cement',
        category: 'cement',
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [],
        conversionFactors: [],
        standardRate: 380,
        minimumStock: 0,
        reorderLevel: 0,
        maximumStock: 0,
        standardWastagePercentage: 0,
        ledgerAccountId: new Types.ObjectId(),
        status: MaterialStatus.Active,
      },
    ]);
    materialId = String(material._id);
  });

  it('posts opening stock and maintains balance', async () => {
    const posted = await service.post(
      {
        projectId,
        materialId,
        transactionType: StockTransactionType.OpeningStock,
        quantityIn: 100,
        quantityOut: 0,
        unit: MaterialUnit.Bag,
        transactionDate: '2026-07-17',
        location: 'Main Store',
      },
      actorId,
    );

    expect(posted.data?.transactionNumber).toMatch(/^SL-\d{4}-\d{6}$/);
    expect(posted.data?.baseUnitQuantity).toBe(100);

    const balance = await service.getBalance({
      projectId,
      materialId,
      location: 'Main Store',
    });
    expect(balance.data?.quantityInBaseUnit).toBe(100);
  });

  it('prevents negative stock unless explicitly allowed', async () => {
    await service.post(
      {
        projectId,
        materialId,
        transactionType: StockTransactionType.OpeningStock,
        quantityIn: 10,
        unit: MaterialUnit.Bag,
        transactionDate: '2026-07-17',
      },
      actorId,
    );

    await expect(
      service.post(
        {
          projectId,
          materialId,
          transactionType: StockTransactionType.MaterialIssue,
          quantityOut: 11,
          unit: MaterialUnit.Bag,
          transactionDate: '2026-07-17',
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const allowed = await service.post(
      {
        projectId,
        materialId,
        transactionType: StockTransactionType.MaterialIssue,
        quantityOut: 11,
        unit: MaterialUnit.Bag,
        transactionDate: '2026-07-17',
        allowNegative: true,
      },
      actorId,
    );
    expect(allowed.data?.baseUnitQuantity).toBe(-11);

    const balance = await service.getBalance({ projectId, materialId });
    expect(balance.data?.quantityInBaseUnit).toBe(-1);
  });

  it('blocks updates and deletes (immutability)', async () => {
    const posted = await service.post(
      {
        projectId,
        materialId,
        transactionType: StockTransactionType.OpeningStock,
        quantityIn: 5,
        unit: MaterialUnit.Bag,
        transactionDate: '2026-07-17',
      },
      actorId,
    );

    await expect(
      ledgerModel.updateOne(
        { _id: posted.data!.id },
        { $set: { quantityIn: 99 } },
      ),
    ).rejects.toThrow(/immutable/i);

    await expect(ledgerModel.deleteOne({ _id: posted.data!.id })).rejects.toThrow(
      /immutable/i,
    );
  });

  it('corrects via reversal entry', async () => {
    const posted = await service.post(
      {
        projectId,
        materialId,
        transactionType: StockTransactionType.PurchaseReceipt,
        quantityIn: 40,
        unit: MaterialUnit.Bag,
        transactionDate: '2026-07-17',
        referenceType: 'goods_receipt',
        referenceId: 'grn-1',
      },
      actorId,
    );

    const reversal = await service.reverse(posted.data!.id, actorId, {
      notes: 'Wrong qty',
    });
    expect(reversal.data?.transactionType).toBe(StockTransactionType.Reversal);
    expect(reversal.data?.quantityOut).toBe(40);
    expect(reversal.data?.baseUnitQuantity).toBe(-40);

    const balance = await service.getBalance({ projectId, materialId });
    expect(balance.data?.quantityInBaseUnit).toBe(0);

    await expect(
      service.reverse(posted.data!.id, actorId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('handles concurrent issues without negative stock', async () => {
    await service.post(
      {
        projectId,
        materialId,
        transactionType: StockTransactionType.OpeningStock,
        quantityIn: 10,
        unit: MaterialUnit.Bag,
        transactionDate: '2026-07-17',
      },
      actorId,
    );

    const issue = () =>
      service.post(
        {
          projectId,
          materialId,
          transactionType: StockTransactionType.MaterialIssue,
          quantityOut: 6,
          unit: MaterialUnit.Bag,
          transactionDate: '2026-07-17',
        },
        actorId,
      );

    const results = await Promise.allSettled([issue(), issue(), issue()]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(2);

    const balance = await service.getBalance({ projectId, materialId });
    expect(balance.data?.quantityInBaseUnit).toBe(4);

    const issues = await ledgerModel.find({
      transactionType: StockTransactionType.MaterialIssue,
    });
    expect(issues).toHaveLength(1);
  });
});
