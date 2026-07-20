import { BadRequestException } from '@nestjs/common';
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
} from '../stock-ledger/schemas/material-stock-balance.schema';
import { StockLedgerService } from '../stock-ledger/stock-ledger.service';
import { MaterialIssuesService } from './material-issues.service';
import {
  MaterialIssue,
  MaterialIssueSchema,
  MaterialIssueStatus,
} from './schemas/material-issue.schema';

describe('MaterialIssuesService', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let issueModel: Model<MaterialIssue>;
  let materialModel: Model<Material>;
  let stockLedgerService: StockLedgerService;
  let service: MaterialIssuesService;
  let projectId: string;
  let materialId: string;
  let actorId: string;
  let receiverId: string;
  let boqItemId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const mongoose = await connect(replSet.getUri());
    connection = mongoose.connection;

    issueModel = connection.model(
      MaterialIssue.name,
      MaterialIssueSchema,
    ) as Model<MaterialIssue>;
    materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
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
      issueModel.syncIndexes(),
      materialModel.syncIndexes(),
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

    service = new MaterialIssuesService(
      issueModel,
      materialModel,
      new NumberingService(counterModel),
      stockLedgerService,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (replSet) await replSet.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    receiverId = new Types.ObjectId().toHexString();
    projectId = new Types.ObjectId().toHexString();
    boqItemId = new Types.ObjectId().toHexString();

    await issueModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(MaterialStockTransaction.name)
      .collection.deleteMany({});
    await connection.model(MaterialStockBalance.name).deleteMany({});
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

  async function createDraft(quantity = 10) {
    return service.create(
      {
        projectId,
        issueDate: '2026-07-17',
        receivedBy: receiverId,
        boqItemId,
        workLocation: 'Block A – Columns',
        items: [
          {
            materialId,
            quantity,
            unit: MaterialUnit.Bag,
          },
        ],
      },
      actorId,
    );
  }

  async function attachSignature(id: string) {
    return service.attachSignatures(
      id,
      {
        recipientSignatureDocumentId: new Types.ObjectId().toHexString(),
        recipientSignatureChecksum: 'b'.repeat(64),
      },
      actorId,
    );
  }

  it('runs Draft → Submitted → Confirmed and reduces stock only on confirm', async () => {
    const created = await createDraft(10);
    expect(created.data?.status).toBe(MaterialIssueStatus.Draft);
    expect(created.data?.issueNumber).toMatch(/^MI-/);
    expect(created.data?.workLocation).toBe('Block A – Columns');
    expect(created.data?.boqItemId).toBe(boqItemId);

    await expect(service.submit(created.data!.id, actorId)).rejects.toThrow(
      BadRequestException,
    );

    await attachSignature(created.data!.id);
    const submitted = await service.submit(created.data!.id, actorId);
    expect(submitted.data?.status).toBe(MaterialIssueStatus.Submitted);

    let balance = await stockLedgerService.getQuantityInBaseUnit({
      projectId,
      materialId,
    });
    expect(balance).toBe(100);

    const confirmed = await service.confirm(submitted.data!.id, actorId);
    expect(confirmed.data?.status).toBe(MaterialIssueStatus.Confirmed);
    expect(confirmed.data?.items[0]?.stockLedgerEntryId).toBeTruthy();

    balance = await stockLedgerService.getQuantityInBaseUnit({
      projectId,
      materialId,
    });
    expect(balance).toBe(90);
  });

  it('prevents issue beyond available stock', async () => {
    const created = await createDraft(150);
    await attachSignature(created.data!.id);
    await expect(service.submit(created.data!.id, actorId)).rejects.toThrow(
      /Insufficient stock/,
    );
  });

  it('supports material return within issued quantity', async () => {
    const created = await createDraft(20);
    await attachSignature(created.data!.id);
    await service.submit(created.data!.id, actorId);
    await service.confirm(created.data!.id, actorId);

    const returned = await service.createReturn(
      created.data!.id,
      {
        returnDate: '2026-07-18',
        items: [
          {
            materialId,
            quantity: 5,
            unit: MaterialUnit.Bag,
            reason: 'Unused bags',
          },
        ],
      },
      actorId,
    );

    expect(returned.data?.returns).toHaveLength(1);
    expect(returned.data?.returns[0]?.returnNumber).toMatch(/^MR-/);
    expect(returned.data?.items[0]?.returnedBaseQuantity).toBe(5);
    expect(returned.data?.items[0]?.remainingBaseQuantity).toBe(15);

    const balance = await stockLedgerService.getQuantityInBaseUnit({
      projectId,
      materialId,
    });
    expect(balance).toBe(85);

    await expect(
      service.createReturn(
        created.data!.id,
        {
          returnDate: '2026-07-19',
          items: [
            {
              materialId,
              quantity: 16,
              unit: MaterialUnit.Bag,
            },
          ],
        },
        actorId,
      ),
    ).rejects.toThrow(/exceeds remaining/);
  });

  it('cancels draft without touching stock', async () => {
    const created = await createDraft(10);
    const cancelled = await service.cancel(created.data!.id, actorId);
    expect(cancelled.data?.status).toBe(MaterialIssueStatus.Cancelled);

    const balance = await stockLedgerService.getQuantityInBaseUnit({
      projectId,
      materialId,
    });
    expect(balance).toBe(100);
  });
});
