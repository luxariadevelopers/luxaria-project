import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  IdempotencyKey,
  IdempotencyKeySchema,
} from '../../database/schemas/idempotency-key.schema';
import { IdempotencyService } from '../../database/services/idempotency.service';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import { MaterialsService } from '../material-master/materials.service';
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
  PurchaseOrder,
  PurchaseOrderSchema,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import { GoodsReceiptsService } from './goods-receipts.service';
import {
  GoodsReceipt,
  GoodsReceiptSchema,
  GoodsReceiptStatus,
} from './schemas/goods-receipt.schema';

describe('GoodsReceiptsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: GoodsReceiptsService;
  let stockTxnModel: Model<MaterialStockTransaction>;
  let projectId: string;
  let purchaseOrderId: string;
  let poLineId: string;
  let vendorId: string;
  let materialId: string;
  let actorId: string;
  let recordReceipt: jest.Mock;

  const address = {
    line1: 'Site',
    line2: null as string | null,
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    country: 'India',
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const grnModel = connection.model(
      GoodsReceipt.name,
      GoodsReceiptSchema,
    ) as Model<GoodsReceipt>;
    const poModel = connection.model(
      PurchaseOrder.name,
      PurchaseOrderSchema,
    ) as Model<PurchaseOrder>;
    const materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    stockTxnModel = connection.model(
      MaterialStockTransaction.name,
      MaterialStockTransactionSchema,
    ) as Model<MaterialStockTransaction>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    const idempotencyModel = connection.model(
      IdempotencyKey.name,
      IdempotencyKeySchema,
    ) as Model<IdempotencyKey>;
    connection.model(Account.name, AccountSchema);

    await Promise.all([
      grnModel.syncIndexes(),
      poModel.syncIndexes(),
      materialModel.syncIndexes(),
      stockTxnModel.syncIndexes(),
      counterModel.syncIndexes(),
      idempotencyModel.syncIndexes(),
    ]);

    const numberingService = new NumberingService(counterModel);
    const materialsService = {
      recordStockTransaction: async (input: {
        materialId: string;
        quantityInBaseUnit: number;
        referenceType: string;
        referenceId?: string | null;
        projectId: string;
        notes?: string | null;
        actorId: string;
      }) => {
        const material = await materialModel.findById(input.materialId).exec();
        const qty = input.quantityInBaseUnit;
        const [row] = await stockTxnModel.create([
          {
            transactionNumber: `SL-GRN-${Date.now()}`,
            projectId: new Types.ObjectId(input.projectId),
            materialId: new Types.ObjectId(input.materialId),
            transactionType: StockTransactionType.PurchaseReceipt,
            quantityIn: qty,
            quantityOut: 0,
            unit: material!.baseUnit,
            baseUnitQuantity: qty,
            quantityInBaseUnit: qty,
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
        return { data: { id: String(row._id) } };
      },
    } as unknown as MaterialsService;

    recordReceipt = jest.fn().mockResolvedValue({ data: {} });

    const configService = {
      get: jest.fn().mockReturnValue(5),
    } as unknown as ConfigService<never, true>;

    const mockProjectScope = {
      assertProjectAccess: jest.fn().mockResolvedValue({ allowed: true }),
      assertOptionalProjectAccess: jest.fn().mockResolvedValue(undefined),
      assertOwnedResource: jest.fn().mockResolvedValue(undefined),
      mergeAuthorisedProjectFilter: jest
        .fn()
        .mockImplementation(async (_a: string, f: unknown) => f),
      findOneForActor: jest.fn(),
      buildScopedIdFilter: jest.fn(),
      authorisedProjectMatchStage: jest.fn().mockResolvedValue({}),
    } as never;

    service = new GoodsReceiptsService(
      grnModel,
      poModel,
      materialModel,
      numberingService,
      materialsService,
      { recordReceipt } as never,
      new IdempotencyService(idempotencyModel),
      configService,
      mockProjectScope,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    vendorId = new Types.ObjectId().toHexString();
    projectId = new Types.ObjectId().toHexString();
    recordReceipt.mockClear();

    await connection
      .model(GoodsReceipt.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(PurchaseOrder.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Material.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(MaterialStockTransaction.name)
      .collection.deleteMany({});
    await connection
      .model(Account.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await connection.model(IdempotencyKey.name).deleteMany({});

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

    const [material] = await connection.model(Material.name).create([
      {
        materialCode: 'MAT-000001',
        name: 'OPC Cement',
        category: 'cement',
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [],
        conversionFactors: [],
        standardRate: 380,
        minimumStock: 20,
        reorderLevel: 50,
        maximumStock: 200,
        standardWastagePercentage: 2,
        ledgerAccountId: account._id,
        status: MaterialStatus.Active,
      },
    ]);
    materialId = String(material._id);

    const [po] = await connection.model(PurchaseOrder.name).create([
      {
        purchaseOrderNumber: 'PO-2026-000001',
        projectId: new Types.ObjectId(projectId),
        purchaseRequestId: new Types.ObjectId(),
        selectedQuotationId: new Types.ObjectId(),
        vendorId: new Types.ObjectId(vendorId),
        orderDate: new Date('2026-07-10'),
        expectedDeliveryDate: new Date('2026-08-01'),
        billingAddress: address,
        deliveryAddress: address,
        paymentTerms: 'Net 30',
        items: [
          {
            materialId: material._id,
            materialCode: material.materialCode,
            materialName: material.name,
            quantity: 100,
            unit: MaterialUnit.Bag,
            rate: 380,
            tax: 0,
            discount: 0,
            total: 38000,
            receivedQuantity: 0,
            balanceQuantity: 100,
          },
        ],
        subtotal: 38000,
        taxes: 0,
        freight: 0,
        discount: 0,
        total: 38000,
        terms: null,
        status: PurchaseOrderStatus.Issued,
        revisionNumber: 1,
        balanceQuantity: 100,
        balanceAmount: 38000,
      },
    ]);
    purchaseOrderId = String(po._id);
    poLineId = String(po.items[0]!._id);
  });

  async function createSubmitted() {
    return service.create(
      {
        projectId,
        purchaseOrderId,
        vendorId,
        receivedDate: '2026-07-17',
        deliveryChallanNumber: 'DC-1',
        vehicleNumber: 'TN01AB1234',
        latitude: 13.08,
        longitude: 80.27,
        photos: ['uploads/grn/photo1.jpg'],
        submit: true,
        items: [
          {
            materialId,
            purchaseOrderLineId: poLineId,
            orderedQuantity: 100,
            receivedQuantity: 100,
            unit: MaterialUnit.Bag,
          },
        ],
      },
      actorId,
      `mobile-txn:${new Types.ObjectId().toHexString()}`,
    );
  }

  it('creates submitted GRN with GPS, photos, and GRN number', async () => {
    const created = await createSubmitted();
    expect(created.data?.grnNumber).toMatch(/^GRN-\d{4}-\d{6}$/);
    expect(created.data?.status).toBe(GoodsReceiptStatus.Submitted);
    expect(created.data?.photos).toHaveLength(1);
    expect(created.data?.latitude).toBe(13.08);
  });

  it('rejects create without photos', async () => {
    await expect(
      service.create(
        {
          projectId,
          purchaseOrderId,
          receivedDate: '2026-07-17',
          latitude: 13,
          longitude: 80,
          photos: [],
          items: [
            {
              materialId,
              purchaseOrderLineId: poLineId,
              orderedQuantity: 100,
              receivedQuantity: 50,
              unit: MaterialUnit.Bag,
            },
          ],
        },
        actorId,
      ),
    ).rejects.toThrow(/photo/);
  });

  it('runs Submitted → QC → Partially Accepted → Posted (stock = accepted only)', async () => {
    const created = await createSubmitted();
    const id = created.data!.id;
    const lineId = created.data!.items[0]!.id;

    await service.startQualityCheck(id, actorId);
    const accepted = await service.accept(
      id,
      {
        items: [
          {
            lineId,
            acceptedQuantity: 90,
            rejectedQuantity: 10,
            rejectionReason: 'Damaged bags on arrival',
          },
        ],
      },
      actorId,
    );
    expect(accepted.data?.status).toBe(GoodsReceiptStatus.PartiallyAccepted);

    const posted = await service.post(id, actorId);
    expect(posted.data?.status).toBe(GoodsReceiptStatus.Posted);

    const txns = await stockTxnModel.find({ referenceType: 'goods_receipt' });
    expect(txns).toHaveLength(1);
    expect(txns[0]?.quantityInBaseUnit).toBe(90);

    expect(recordReceipt).toHaveBeenCalledWith(
      purchaseOrderId,
      {
        items: [{ lineId: poLineId, receivedQuantity: 90 }],
      },
      actorId,
    );
  });

  it('replays create with same idempotency key', async () => {
    const key = 'mobile-txn:grn-replay-1';
    const first = await service.create(
      {
        projectId,
        purchaseOrderId,
        receivedDate: '2026-07-17',
        latitude: 13,
        longitude: 80,
        photos: ['p1'],
        submit: true,
        items: [
          {
            materialId,
            purchaseOrderLineId: poLineId,
            orderedQuantity: 100,
            receivedQuantity: 40,
            unit: MaterialUnit.Bag,
          },
        ],
      },
      actorId,
      key,
    );
    const second = await service.create(
      {
        projectId,
        purchaseOrderId,
        receivedDate: '2026-07-17',
        latitude: 13,
        longitude: 80,
        photos: ['p1'],
        submit: true,
        items: [
          {
            materialId,
            purchaseOrderLineId: poLineId,
            orderedQuantity: 100,
            receivedQuantity: 40,
            unit: MaterialUnit.Bag,
          },
        ],
      },
      actorId,
      key,
    );
    expect(second.data?.id).toBe(first.data?.id);
  });
});
