import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import type { StockLedgerService } from '../stock-ledger/stock-ledger.service';
import { MaterialsService } from './materials.service';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
  StockTransactionType,
} from './schemas/material-stock-transaction.schema';
import {
  Material,
  MaterialSchema,
  MaterialStatus,
  MaterialUnit,
} from './schemas/material.schema';

describe('MaterialsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let materialModel: Model<Material>;
  let service: MaterialsService;
  let ledgerAccountId: string;
  const actorId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    const stockTxnModel = connection.model(
      MaterialStockTransaction.name,
      MaterialStockTransactionSchema,
    ) as Model<MaterialStockTransaction>;
    const accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      materialModel.syncIndexes(),
      stockTxnModel.syncIndexes(),
      accountModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const stockLedgerService = {
      postEntry: async (input: {
        projectId: string;
        materialId: string;
        quantityIn?: number;
        quantityOut?: number;
        referenceType: string;
        referenceId?: string | null;
        actorId: string;
        notes?: string | null;
      }) => {
        const material = await materialModel.findById(input.materialId).exec();
        const base =
          (input.quantityIn ?? 0) - (input.quantityOut ?? 0);
        const [row] = await stockTxnModel.create([
          {
            transactionNumber: `SL-TEST-${Date.now()}`,
            projectId: new Types.ObjectId(input.projectId),
            materialId: new Types.ObjectId(input.materialId),
            transactionType: StockTransactionType.PurchaseReceipt,
            quantityIn: input.quantityIn ?? 0,
            quantityOut: input.quantityOut ?? 0,
            unit: material!.baseUnit,
            baseUnitQuantity: base,
            quantityInBaseUnit: base,
            baseUnit: material!.baseUnit,
            referenceType: input.referenceType,
            referenceId: input.referenceId ?? null,
            transactionDate: new Date(),
            location: null,
            batch: null,
            createdBy: new Types.ObjectId(input.actorId),
            notes: input.notes ?? null,
          },
        ]);
        return row;
      },
      hasStockTransactions: async (materialId: string) => {
        const count = await stockTxnModel
          .countDocuments({ materialId: new Types.ObjectId(materialId) })
          .exec();
        return count > 0;
      },
    } as unknown as StockLedgerService;

    service = new MaterialsService(
      materialModel,
      stockTxnModel,
      accountModel,
      new NumberingService(counterModel),
      stockLedgerService,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await materialModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(MaterialStockTransaction.name)
      .collection.deleteMany({});
    await connection
      .model(Account.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [account] = await connection.model(Account.name).create([
      {
        accountCode: 'EXP-MAT',
        accountName: 'Material Purchase',
        accountType: AccountType.Expense,
        accountCategory: AccountCategory.MaterialPurchase,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
    ]);
    ledgerAccountId = String(account._id);
  });

  it('creates material with MAT code and validated conversions', async () => {
    const response = await service.create(
      {
        name: 'OPC Cement 53 Grade',
        category: 'Cement',
        brand: 'UltraTech',
        specification: '50kg bag',
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [MaterialUnit.Ton],
        conversionFactors: [
          { unit: MaterialUnit.Ton, factorToBase: 20 },
        ],
        standardRate: 380,
        minimumStock: 50,
        reorderLevel: 100,
        maximumStock: 500,
        standardWastagePercentage: 2,
        ledgerAccountId,
      },
      actorId,
    );

    expect(response.data?.materialCode).toMatch(/^MAT-\d{6}$/);
    expect(response.data?.category).toBe('cement');
    expect(response.data?.baseUnit).toBe(MaterialUnit.Bag);
    expect(response.data?.conversionFactors).toEqual([
      { unit: MaterialUnit.Ton, factorToBase: 20 },
    ]);
    expect(response.data?.baseUnitLocked).toBe(false);
  });

  it('rejects invalid conversions and stock levels on create', async () => {
    await expect(
      service.create(
        {
          name: 'Bad',
          category: 'steel',
          baseUnit: MaterialUnit.Kilogram,
          alternateUnits: [MaterialUnit.Ton],
          conversionFactors: [],
          ledgerAccountId,
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create(
        {
          name: 'Bad stock',
          category: 'steel',
          baseUnit: MaterialUnit.Number,
          minimumStock: 100,
          reorderLevel: 10,
          maximumStock: 200,
          ledgerAccountId,
        },
        actorId,
      ),
    ).rejects.toThrow(/minimumStock cannot be greater than reorderLevel/);
  });

  it('searches and filters materials', async () => {
    await service.create(
      {
        name: 'TMT Bar 12mm',
        category: 'steel',
        brand: 'JSW',
        baseUnit: MaterialUnit.Kilogram,
        ledgerAccountId,
      },
      actorId,
    );
    await service.create(
      {
        name: 'River Sand',
        category: 'aggregates',
        baseUnit: MaterialUnit.CubicFoot,
        ledgerAccountId,
      },
      actorId,
    );

    const search = await service.list({ search: 'tmt' });
    expect(search.data).toHaveLength(1);
    expect(search.data?.[0]?.name).toBe('TMT Bar 12mm');

    const byCategory = await service.list({ category: 'aggregates' });
    expect(byCategory.data).toHaveLength(1);

    const byUnit = await service.list({ baseUnit: MaterialUnit.Kilogram });
    expect(byUnit.data).toHaveLength(1);
  });

  it('locks base unit after stock transactions', async () => {
    const created = await service.create(
      {
        name: 'Binding Wire',
        category: 'steel',
        baseUnit: MaterialUnit.Kilogram,
        alternateUnits: [MaterialUnit.Bag],
        conversionFactors: [{ unit: MaterialUnit.Bag, factorToBase: 25 }],
        ledgerAccountId,
      },
      actorId,
    );
    const id = created.data!.id;

    await service.update(
      id,
      { baseUnit: MaterialUnit.Bag, alternateUnits: [], conversionFactors: [] },
      actorId,
    );
    expect((await service.getById(id)).data?.baseUnit).toBe(MaterialUnit.Bag);

    // reset for lock test
    await service.update(
      id,
      {
        baseUnit: MaterialUnit.Kilogram,
        alternateUnits: [MaterialUnit.Bag],
        conversionFactors: [{ unit: MaterialUnit.Bag, factorToBase: 25 }],
      },
      actorId,
    );

    await service.recordStockTransaction({
      materialId: id,
      quantityInBaseUnit: 100,
      referenceType: 'goods_receipt',
      referenceId: 'grn-1',
      projectId: new Types.ObjectId().toHexString(),
      actorId,
    });

    const locked = await service.getById(id);
    expect(locked.data?.baseUnitLocked).toBe(true);

    await expect(
      service.update(
        id,
        {
          baseUnit: MaterialUnit.Ton,
          alternateUnits: [MaterialUnit.Kilogram],
          conversionFactors: [
            { unit: MaterialUnit.Kilogram, factorToBase: 0.001 },
          ],
        },
        actorId,
      ),
    ).rejects.toThrow(/without a migration procedure/);

    // Non-base fields still updatable
    const updated = await service.update(
      id,
      { standardRate: 95, status: MaterialStatus.Inactive },
      actorId,
    );
    expect(updated.data?.standardRate).toBe(95);
    expect(updated.data?.status).toBe(MaterialStatus.Inactive);
    expect(updated.data?.baseUnit).toBe(MaterialUnit.Kilogram);
  });

  it('rejects invalid ledger account category', async () => {
    const [bank] = await connection.model(Account.name).create([
      {
        accountCode: 'BANK-1',
        accountName: 'Bank',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Bank,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
    ]);

    await expect(
      service.create(
        {
          name: 'Wrong ledger',
          category: 'misc',
          baseUnit: MaterialUnit.Number,
          ledgerAccountId: String(bank._id),
        },
        actorId,
      ),
    ).rejects.toThrow(/ledgerAccountId must be one of/);
  });
});
