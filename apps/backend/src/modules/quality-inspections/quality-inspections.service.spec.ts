import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  GoodsReceipt,
  GoodsReceiptSchema,
  GoodsReceiptStatus,
} from '../goods-receipts/schemas/goods-receipt.schema';
import { MaterialUnit } from '../material-master/schemas/material.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { QualityInspectionsService } from './quality-inspections.service';
import {
  QualityInspection,
  QualityInspectionResult,
  QualityInspectionSchema,
  QualityInspectionStatus,
} from './schemas/quality-inspection.schema';
import {
  VendorQualityScore,
  VendorQualityScoreSchema,
} from './schemas/vendor-quality-score.schema';

describe('QualityInspectionsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: QualityInspectionsService;
  let projectId: string;
  let vendorId: string;
  let grnId: string;
  let grnLineId: string;
  let actorId: string;
  let startQualityCheck: jest.Mock;
  let applyInspectionResult: jest.Mock;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const inspectionModel = connection.model(
      QualityInspection.name,
      QualityInspectionSchema,
    ) as Model<QualityInspection>;
    const scoreModel = connection.model(
      VendorQualityScore.name,
      VendorQualityScoreSchema,
    ) as Model<VendorQualityScore>;
    const grnModel = connection.model(
      GoodsReceipt.name,
      GoodsReceiptSchema,
    ) as Model<GoodsReceipt>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      inspectionModel.syncIndexes(),
      scoreModel.syncIndexes(),
      grnModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    startQualityCheck = jest.fn().mockResolvedValue({});
    applyInspectionResult = jest.fn().mockResolvedValue({});

    service = new QualityInspectionsService(
      inspectionModel,
      scoreModel,
      grnModel,
      new NumberingService(counterModel),
      { startQualityCheck, applyInspectionResult } as never,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    projectId = new Types.ObjectId().toHexString();
    vendorId = new Types.ObjectId().toHexString();
    startQualityCheck.mockClear();
    applyInspectionResult.mockClear();

    await connection
      .model(QualityInspection.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(VendorQualityScore.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(GoodsReceipt.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const materialId = new Types.ObjectId();
    const [grn] = await connection.model(GoodsReceipt.name).create([
      {
        grnNumber: 'GRN-2026-000001',
        projectId: new Types.ObjectId(projectId),
        purchaseOrderId: new Types.ObjectId(),
        vendorId: new Types.ObjectId(vendorId),
        deliveryChallanNumber: 'DC-1',
        vehicleNumber: null,
        receivedDate: new Date('2026-07-17'),
        receivedBy: new Types.ObjectId(actorId),
        items: [
          {
            materialId,
            materialCode: 'MAT-000001',
            materialName: 'OPC Cement',
            purchaseOrderLineId: new Types.ObjectId(),
            orderedQuantity: 100,
            receivedQuantity: 100,
            acceptedQuantity: null,
            rejectedQuantity: null,
            unit: MaterialUnit.Bag,
            rejectionReason: null,
          },
        ],
        photos: ['photo-1'],
        challanDocument: null,
        weighbridgeDocument: null,
        latitude: 13.08,
        longitude: 80.27,
        status: GoodsReceiptStatus.Submitted,
      },
    ]);
    grnId = String(grn._id);
    grnLineId = String(grn.items[0]!._id);
  });

  it('creates QI and moves GRN into quality check', async () => {
    const created = await service.create(
      {
        grnId,
        inspectionDate: '2026-07-17',
        testParameters: [
          {
            name: 'Compressive strength',
            expectedValue: '53',
            actualValue: '54',
            unit: 'MPa',
            passed: true,
          },
        ],
        samplePhotos: ['sample-1.jpg'],
      },
      actorId,
    );

    expect(created.data?.inspectionNumber).toMatch(/^QI-\d{4}-\d{6}$/);
    expect(created.data?.status).toBe(QualityInspectionStatus.Draft);
    expect(created.data?.items).toHaveLength(1);
    expect(startQualityCheck).toHaveBeenCalledWith(grnId, actorId);
  });

  it('completes partial acceptance and updates vendor score', async () => {
    const created = await service.create(
      { grnId, inspectionDate: '2026-07-17' },
      actorId,
    );

    const completed = await service.complete(
      created.data!.id,
      {
        result: QualityInspectionResult.PartiallyAccepted,
        items: [
          {
            grnLineId,
            acceptedQuantity: 90,
            rejectedQuantity: 10,
            rejectionReason: 'Damaged bags',
          },
        ],
        remarks: 'Partial accept after visual QC',
      },
      actorId,
    );

    expect(completed.data?.inspection.status).toBe(
      QualityInspectionStatus.Completed,
    );
    expect(completed.data?.inspection.result).toBe(
      QualityInspectionResult.PartiallyAccepted,
    );
    expect(applyInspectionResult).toHaveBeenCalledWith(
      grnId,
      expect.objectContaining({
        allowFullReject: false,
        forceStatus: GoodsReceiptStatus.PartiallyAccepted,
      }),
      actorId,
    );
    expect(completed.data?.vendorQualityScore.score).toBe(60);
    expect(completed.data?.vendorQualityScore.partiallyAcceptedCount).toBe(1);
  });

  it('rejects all stock and does not allow availability (GRN Rejected)', async () => {
    const created = await service.create(
      { grnId, inspectionDate: '2026-07-17' },
      actorId,
    );

    await service.complete(
      created.data!.id,
      {
        result: QualityInspectionResult.Rejected,
        items: [
          {
            grnLineId,
            acceptedQuantity: 0,
            rejectedQuantity: 100,
            rejectionReason: 'Failed compressive strength',
          },
        ],
      },
      actorId,
    );

    expect(applyInspectionResult).toHaveBeenCalledWith(
      grnId,
      expect.objectContaining({
        allowFullReject: true,
        forceStatus: GoodsReceiptStatus.Rejected,
        items: [
          expect.objectContaining({
            acceptedQuantity: 0,
            rejectedQuantity: 100,
          }),
        ],
      }),
      actorId,
    );

    const score = await service.getVendorQualityScore(vendorId);
    expect(score.data?.rejectedCount).toBe(1);
    expect(score.data?.score).toBe(0);
  });

  it('hold keeps GRN without accepting stock', async () => {
    const created = await service.create(
      { grnId, inspectionDate: '2026-07-17' },
      actorId,
    );

    await service.complete(
      created.data!.id,
      { result: QualityInspectionResult.Hold, remarks: 'Await lab report' },
      actorId,
    );

    expect(applyInspectionResult).toHaveBeenCalledWith(
      grnId,
      { items: [], hold: true },
      actorId,
    );
  });
});
