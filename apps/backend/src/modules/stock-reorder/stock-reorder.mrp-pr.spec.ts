import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  Material,
  MaterialSchema,
  MaterialUnit,
} from '../material-master/schemas/material.schema';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
} from '../material-master/schemas/material-stock-transaction.schema';
import {
  Project,
  ProjectSchema,
} from '../projects/schemas/project.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  MaterialStockBalance,
  MaterialStockBalanceSchema,
} from '../stock-ledger/schemas/material-stock-balance.schema';
import {
  StockReorderAlert,
  StockReorderAlertSchema,
  StockReorderAlertStatus,
  StockReorderAlertType,
} from './schemas/stock-reorder-alert.schema';
import { StockReorderService } from './stock-reorder.service';

describe('StockReorderService.createPurchaseRequestFromAlert', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: StockReorderService;
  let alertModel: Model<StockReorderAlert>;
  let createPr: jest.Mock;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    alertModel = connection.model(
      StockReorderAlert.name,
      StockReorderAlertSchema,
    ) as Model<StockReorderAlert>;
    const materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    const balanceModel = connection.model(
      MaterialStockBalance.name,
      MaterialStockBalanceSchema,
    ) as Model<MaterialStockBalance>;
    const ledgerModel = connection.model(
      MaterialStockTransaction.name,
      MaterialStockTransactionSchema,
    ) as Model<MaterialStockTransaction>;
    const poModel = connection.model(
      PurchaseOrder.name,
      PurchaseOrderSchema,
    ) as Model<PurchaseOrder>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;

    createPr = jest.fn().mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString(), status: 'draft' },
    });

    const configService = {
      get: jest.fn().mockReturnValue(30),
    } as unknown as ConfigService;

    service = new StockReorderService(
      alertModel,
      materialModel,
      balanceModel,
      ledgerModel,
      poModel,
      projectModel,
      configService,
      { create: createPr } as never,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    createPr.mockClear();
    await alertModel.deleteMany({});
  });

  it('creates draft PR from recommended qty and resolves the alert', async () => {
    const projectId = new Types.ObjectId();
    const materialId = new Types.ObjectId();
    const actorId = new Types.ObjectId().toHexString();

    const alert = await alertModel.create({
      projectId,
      materialId,
      materialCode: 'CEM',
      materialName: 'Cement',
      alertType: StockReorderAlertType.BelowReorderLevel,
      status: StockReorderAlertStatus.Open,
      message: 'Below reorder',
      availableStock: 5,
      pendingPoQuantity: 0,
      averageDailyConsumption: 2,
      estimatedStockOutDate: null,
      reorderLevel: 50,
      recommendedPurchaseQuantity: 45,
      baseUnit: MaterialUnit.Bag,
      evaluatedAt: new Date(),
    });

    const result = await service.createPurchaseRequestFromAlert(
      String(alert._id),
      actorId,
    );

    expect(createPr).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: String(projectId),
        sourceReorderAlertId: String(alert._id),
        items: [
          expect.objectContaining({
            materialId: String(materialId),
            requestedQuantity: 45,
            unit: MaterialUnit.Bag,
          }),
        ],
      }),
      actorId,
    );
    expect(result.data?.purchaseRequest).toBeTruthy();

    const refreshed = await alertModel.findById(alert._id).exec();
    expect(refreshed?.status).toBe(StockReorderAlertStatus.Resolved);
  });
});
