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
import {
  Material,
  MaterialSchema,
  MaterialStatus,
  MaterialUnit,
} from '../material-master/schemas/material.schema';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
} from '../material-master/schemas/material-stock-transaction.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { PurchaseRequestsService } from './purchase-requests.service';
import {
  PurchaseRequest,
  PurchaseRequestSchema,
  PurchaseRequestStatus,
} from './schemas/purchase-request.schema';

describe('PurchaseRequestsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: PurchaseRequestsService;
  let projectId: string;
  let materialId: string;
  let actorId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const requestModel = connection.model(
      PurchaseRequest.name,
      PurchaseRequestSchema,
    ) as Model<PurchaseRequest>;
    const materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    const stockTxnModel = connection.model(
      MaterialStockTransaction.name,
      MaterialStockTransactionSchema,
    ) as Model<MaterialStockTransaction>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    const accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;

    await Promise.all([
      requestModel.syncIndexes(),
      materialModel.syncIndexes(),
      stockTxnModel.syncIndexes(),
      projectModel.syncIndexes(),
      counterModel.syncIndexes(),
      accountModel.syncIndexes(),
    ]);
    const mockProjectScope = {
      assertProjectAccess: jest.fn().mockResolvedValue({ allowed: true }),
      assertOptionalProjectAccess: jest.fn().mockResolvedValue(undefined),
      assertOwnedResource: jest.fn().mockResolvedValue(undefined),
      mergeAuthorisedProjectFilter: jest
        .fn()
        .mockImplementation(async (_a, f) => f),
      findOneForActor: jest.fn(),
      buildScopedIdFilter: jest.fn(),
      authorisedProjectMatchStage: jest.fn().mockResolvedValue({}),
    } as never;


    service = new PurchaseRequestsService(
      requestModel,
      materialModel,
      stockTxnModel,
      projectModel,
      new NumberingService(counterModel),
      mockProjectScope
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    await connection
      .model(PurchaseRequest.name)
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
      .model(Project.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
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

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-0001',
        projectName: 'Test Project',
        projectType: ProjectType.Residential,
        address: {
          line1: 'Site',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        status: ProjectStatus.Construction,
      },
    ]);
    projectId = String(project._id);

    const [material] = await connection.model(Material.name).create([
      {
        materialCode: 'MAT-000001',
        name: 'OPC Cement',
        category: 'cement',
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [MaterialUnit.Ton],
        conversionFactors: [{ unit: MaterialUnit.Ton, factorToBase: 20 }],
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

    await connection.model(MaterialStockTransaction.name).create({
      transactionNumber: 'SL-2026-000001',
      materialId: material._id,
      projectId: project._id,
      transactionType: 'opening_stock',
      quantityIn: 30,
      quantityOut: 0,
      unit: MaterialUnit.Bag,
      baseUnitQuantity: 30,
      quantityInBaseUnit: 30,
      baseUnit: MaterialUnit.Bag,
      referenceType: 'opening',
      referenceId: null,
      transactionDate: new Date(),
      location: null,
      batch: null,
      createdBy: new Types.ObjectId(actorId),
    });
  });

  it('creates PR with stock snapshot, reorder level, and high-qty warnings', async () => {
    const created = await service.create(
      {
        projectId,
        requiredByDate: '2026-08-15',
        justification: 'Slab pour',
        items: [
          {
            materialId,
            requestedQuantity: 400,
            unit: MaterialUnit.Bag,
            estimatedRate: 380,
          },
        ],
      },
      actorId,
    );

    expect(created.data?.requestNumber).toMatch(/^PR-\d{4}-\d{6}$/);
    expect(created.data?.status).toBe(PurchaseRequestStatus.Draft);
    expect(created.data?.items[0]?.currentStock).toBe(30);
    expect(created.data?.items[0]?.reorderLevel).toBe(50);
    expect(created.data?.items[0]?.warnings.length).toBeGreaterThan(0);
    expect(created.data?.warnings.length).toBeGreaterThan(0);
  });

  it('runs Draft → Submitted → Reviewed → Approved → Sourcing → Closed', async () => {
    const created = await service.create(
      {
        projectId,
        requiredByDate: '2026-08-15',
        justification: 'Normal buy',
        items: [
          {
            materialId,
            requestedQuantity: 40,
            unit: MaterialUnit.Bag,
          },
        ],
      },
      actorId,
    );
    const id = created.data!.id;
    const lineId = created.data!.items[0]!.id;

    await service.submit(id, actorId);
    expect((await service.getById(id)).data?.status).toBe(
      PurchaseRequestStatus.Submitted,
    );

    await expect(
      service.approve(id, { items: [{ lineId, approvedQuantity: 40 }] }, actorId),
    ).rejects.toThrow(/Approval required after review/);

    await service.review(id, { notes: 'OK' }, actorId);
    expect((await service.getById(id)).data?.status).toBe(
      PurchaseRequestStatus.Reviewed,
    );

    const approved = await service.approve(
      id,
      { items: [{ lineId, approvedQuantity: 40 }], notes: 'Full' },
      actorId,
    );
    expect(approved.data?.status).toBe(PurchaseRequestStatus.Approved);
    expect(approved.data?.isPartiallyApproved).toBe(false);

    await service.startSourcing(id, actorId);
    expect((await service.getById(id)).data?.status).toBe(
      PurchaseRequestStatus.Sourcing,
    );

    await service.close(id, actorId);
    expect((await service.getById(id)).data?.status).toBe(
      PurchaseRequestStatus.Closed,
    );
  });

  it('supports partial approval', async () => {
    const created = await service.create(
      {
        projectId,
        requiredByDate: '2026-08-20',
        justification: 'Partial case',
        items: [
          {
            materialId,
            requestedQuantity: 100,
            unit: MaterialUnit.Bag,
          },
        ],
      },
      actorId,
    );
    const id = created.data!.id;
    const lineId = created.data!.items[0]!.id;

    await service.submit(id, actorId);
    await service.review(id, {}, actorId);

    const approved = await service.approve(
      id,
      { items: [{ lineId, approvedQuantity: 60 }] },
      actorId,
    );

    expect(approved.data?.status).toBe(PurchaseRequestStatus.Approved);
    expect(approved.data?.isPartiallyApproved).toBe(true);
    expect(approved.data?.items[0]?.approvedQuantity).toBe(60);
    expect(approved.data?.items[0]?.lineStatus).toBe('partially_approved');
  });

  it('rejects approve with all-zero quantities', async () => {
    const created = await service.create(
      {
        projectId,
        requiredByDate: '2026-08-20',
        justification: 'Reject lines',
        items: [
          {
            materialId,
            requestedQuantity: 10,
            unit: MaterialUnit.Bag,
          },
        ],
      },
      actorId,
    );
    const id = created.data!.id;
    const lineId = created.data!.items[0]!.id;
    await service.submit(id, actorId);
    await service.review(id, {}, actorId);

    await expect(
      service.approve(id, { items: [{ lineId, approvedQuantity: 0 }] }, actorId),
    ).rejects.toThrow(BadRequestException);
  });
});
