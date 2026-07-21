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
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  MaterialStockBalance,
  MaterialStockBalanceSchema,
} from '../stock-ledger/schemas/material-stock-balance.schema';
import { StockLedgerService } from '../stock-ledger/stock-ledger.service';
import {
  StockReorderAlert,
  StockReorderAlertSchema,
  StockReorderAlertType,
} from './schemas/stock-reorder-alert.schema';
import { StockReorderService } from './stock-reorder.service';

describe('StockReorderService', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let service: StockReorderService;
  let stockLedgerService: StockLedgerService;
  let alertModel: Model<StockReorderAlert>;
  let materialModel: Model<Material>;
  let poModel: Model<PurchaseOrder>;
  let projectModel: Model<Project>;
  let projectId: string;
  let materialId: string;
  let actorId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const mongoose = await connect(replSet.getUri());
    connection = mongoose.connection;

    alertModel = connection.model(
      StockReorderAlert.name,
      StockReorderAlertSchema,
    ) as Model<StockReorderAlert>;
    materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    poModel = connection.model(
      PurchaseOrder.name,
      PurchaseOrderSchema,
    ) as Model<PurchaseOrder>;
    projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
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
      alertModel.syncIndexes(),
      materialModel.syncIndexes(),
      poModel.syncIndexes(),
      projectModel.syncIndexes(),
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
        if (key === 'stockForecastLookbackDays') return 30;
        if (key === 'stockStockoutAlertDays') return 3;
        if (key === 'stockSlowMovingDays') return 45;
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

    const mockPurchaseRequestsService = {
      create: jest.fn(),
    } as never;

    service = new StockReorderService(
      alertModel,
      materialModel,
      balanceModel,
      ledgerModel,
      poModel,
      projectModel,
      configService,
      mockPurchaseRequestsService,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (replSet) await replSet.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    await alertModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(MaterialStockTransaction.name)
      .collection.deleteMany({});
    await connection.model(MaterialStockBalance.name).deleteMany({});
    await materialModel.deleteMany({}).setOptions({ withDeleted: true });
    await poModel.deleteMany({}).setOptions({ withDeleted: true });
    await projectModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [project] = await projectModel.create([
      {
        projectCode: 'PRJ-2026-0001',
        projectName: 'Heights',
        projectType: ProjectType.Residential,
        address: {
          line1: 'Site Road',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        status: ProjectStatus.Construction,
        startDate: new Date('2026-01-01'),
      },
    ]);
    projectId = String(project._id);

    const [material] = await materialModel.create([
      {
        materialCode: 'MAT-000001',
        name: 'Cement',
        category: 'cement',
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [],
        conversionFactors: [],
        standardRate: 400,
        minimumStock: 20,
        reorderLevel: 50,
        maximumStock: 200,
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
      quantityIn: 40,
      quantityOut: 0,
      unit: MaterialUnit.Bag,
      referenceType: 'opening',
      transactionDate: '2026-06-01',
      actorId,
    });

    // 30 bags issued over lookback → avg 1/day
    await stockLedgerService.postEntry({
      projectId,
      materialId,
      transactionType: StockTransactionType.MaterialIssue,
      quantityIn: 0,
      quantityOut: 30,
      unit: MaterialUnit.Bag,
      referenceType: 'material_issue',
      transactionDate: '2026-07-10',
      actorId,
    });
  });

  it('computes forecast metrics including pending PO and stock-out', async () => {
    await poModel.create({
      purchaseOrderNumber: 'PO-2026-000001',
      projectId: new Types.ObjectId(projectId),
      purchaseRequestId: new Types.ObjectId(),
      selectedQuotationId: new Types.ObjectId(),
      vendorId: new Types.ObjectId(),
      orderDate: new Date('2026-07-01'),
      expectedDeliveryDate: new Date('2026-07-20'),
      billingAddress: {
        line1: 'A',
        city: 'Chennai',
        state: 'TN',
        pincode: '600001',
        country: 'IN',
      },
      deliveryAddress: {
        line1: 'A',
        city: 'Chennai',
        state: 'TN',
        pincode: '600001',
        country: 'IN',
      },
      items: [
        {
          materialId: new Types.ObjectId(materialId),
          materialCode: 'MAT-000001',
          materialName: 'Cement',
          quantity: 25,
          unit: MaterialUnit.Bag,
          rate: 400,
          tax: 0,
          discount: 0,
          total: 10000,
          receivedQuantity: 5,
          balanceQuantity: 20,
        },
      ],
      subtotal: 10000,
      taxes: 0,
      freight: 0,
      discount: 0,
      total: 10000,
      balanceQuantity: 20,
      balanceAmount: 8000,
      status: PurchaseOrderStatus.PartiallyReceived,
      terms: null,
      revisionNumber: 1,
    });

    const forecast = await service.getForecast({
      projectId,
      materialId,
      lookbackDays: 30,
    });
    const row = forecast.data![0];
    expect(row.availableStock).toBe(10); // 40 opening - 30 issue
    expect(row.pendingPoQuantity).toBe(20);
    expect(row.averageDailyConsumption).toBe(1);
    expect(row.daysOfCover).toBe(30); // (10+20)/1
    expect(row.reorderLevel).toBe(50);
    expect(row.recommendedPurchaseQuantity).toBe(170); // 200 - 30
    expect(row.alerts).toContain(StockReorderAlertType.BelowReorderLevel);
    expect(row.alerts).toContain(StockReorderAlertType.BelowMinimumLevel);
  });

  it('persists alerts via scheduled evaluate job path', async () => {
    const result = await service.evaluate(
      { projectId, materialId, lookbackDays: 30 },
      'job-test-1',
    );
    expect(result.data?.alertCount).toBeGreaterThan(0);

    const alerts = await service.listAlerts({
      projectId,
      status: undefined,
      page: 1,
      limit: 50,
    });
    const types = (alerts.data ?? []).map((a) => a.alertType);
    expect(types).toContain(StockReorderAlertType.BelowReorderLevel);
    expect(types).toContain(StockReorderAlertType.NoOpenPurchaseOrder);
  });
});
