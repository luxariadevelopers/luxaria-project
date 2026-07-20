import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { ApprovalStatus } from '../approvals/schemas/approval-request.schema';
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
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  PurchaseRequest,
  PurchaseRequestPriority,
  PurchaseRequestSchema,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
import {
  VendorQuotation,
  VendorQuotationSchema,
  VendorQuotationStatus,
} from '../vendor-quotations/schemas/vendor-quotation.schema';
import {
  Vendor,
  VendorSchema,
  VendorStatus,
  VendorVerificationStatus,
} from '../vendors/schemas/vendor.schema';
import { PurchaseOrderPdfService } from './purchase-order-pdf.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
  PurchaseOrderStatus,
} from './schemas/purchase-order.schema';

describe('PurchaseOrdersService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: PurchaseOrdersService;
  let projectId: string;
  let purchaseRequestId: string;
  let quotationId: string;
  let materialId: string;
  let actorId: string;
  let approvalsCreate: jest.Mock;
  let approvalsApprove: jest.Mock;
  let approvalsReject: jest.Mock;

  const address = {
    line1: 'Site Road',
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

    const poModel = connection.model(
      PurchaseOrder.name,
      PurchaseOrderSchema,
    ) as Model<PurchaseOrder>;
    const prModel = connection.model(
      PurchaseRequest.name,
      PurchaseRequestSchema,
    ) as Model<PurchaseRequest>;
    const quotationModel = connection.model(
      VendorQuotation.name,
      VendorQuotationSchema,
    ) as Model<VendorQuotation>;
    const vendorModel = connection.model(
      Vendor.name,
      VendorSchema,
    ) as Model<Vendor>;
    const materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    connection.model(Account.name, AccountSchema);

    await Promise.all([
      poModel.syncIndexes(),
      prModel.syncIndexes(),
      quotationModel.syncIndexes(),
      vendorModel.syncIndexes(),
      materialModel.syncIndexes(),
      projectModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    approvalsCreate = jest.fn().mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });
    approvalsApprove = jest.fn().mockResolvedValue({
      data: { status: ApprovalStatus.Approved },
    });
    approvalsReject = jest.fn().mockResolvedValue({
      data: { status: ApprovalStatus.Rejected },
    });

    const configService = {
      get: jest.fn().mockReturnValue(5),
    } as unknown as ConfigService;

    service = new PurchaseOrdersService(
      poModel,
      prModel,
      quotationModel,
      vendorModel,
      materialModel,
      projectModel,
      new NumberingService(counterModel),
      {
        create: approvalsCreate,
        approve: approvalsApprove,
        reject: approvalsReject,
      } as never,
      new PurchaseOrderPdfService(),
      configService as unknown as ConfigService<never, true>,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    approvalsCreate.mockClear();
    approvalsApprove.mockClear();
    approvalsReject.mockClear();
    approvalsCreate.mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });
    approvalsApprove.mockResolvedValue({
      data: { status: ApprovalStatus.Approved },
    });

    await connection
      .model(PurchaseOrder.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(VendorQuotation.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(PurchaseRequest.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Vendor.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Material.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
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
        address,
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

    const [pr] = await connection.model(PurchaseRequest.name).create([
      {
        requestNumber: 'PR-2026-000001',
        projectId: project._id,
        requestedBy: new Types.ObjectId(actorId),
        requiredByDate: new Date('2026-08-15'),
        priority: PurchaseRequestPriority.Normal,
        items: [],
        justification: 'Slab',
        status: PurchaseRequestStatus.Sourcing,
      },
    ]);
    purchaseRequestId = String(pr._id);

    const [vendor] = await connection.model(Vendor.name).create([
      {
        vendorCode: 'VEN-000001',
        legalName: 'Alpha Cement',
        status: VendorStatus.Active,
        verificationStatus: VendorVerificationStatus.Verified,
      },
    ]);
    const [quotation] = await connection.model(VendorQuotation.name).create([
      {
        quotationNumber: 'VQ-2026-000001',
        purchaseRequestId: pr._id,
        projectId: project._id,
        vendorId: vendor._id,
        quotationDate: new Date('2026-07-17'),
        validityDate: new Date('2026-08-17'),
        deliveryDays: 7,
        paymentTerms: 'Net 30',
        freight: 500,
        taxes: 100,
        discount: 0,
        items: [
          {
            materialId: material._id,
            materialCode: material.materialCode,
            materialName: material.name,
            quantity: 100,
            unit: MaterialUnit.Bag,
            rate: 380,
            tax: 684,
            discount: 0,
            total: 38684,
          },
        ],
        itemsSubtotal: 38684,
        grandTotal: 39284,
        status: VendorQuotationStatus.Final,
        revisionNumber: 1,
        rootQuotationId: null,
      },
    ]);
    quotationId = String(quotation._id);
  });

  async function createDraft() {
    return service.create(
      {
        projectId,
        purchaseRequestId,
        selectedQuotationId: quotationId,
        orderDate: '2026-07-17',
        expectedDeliveryDate: '2026-08-01',
        billingAddress: address,
        deliveryAddress: address,
        terms: 'Standard Luxaria PO terms',
      },
      actorId,
    );
  }

  async function createIssued() {
    const created = await createDraft();
    await service.submitForApproval(created.data!.id, actorId);
    return service.approve(created.data!.id, {}, actorId);
  }

  it('creates PO from quotation with number, totals, and full balance', async () => {
    const created = await createDraft();
    expect(created.data?.purchaseOrderNumber).toMatch(/^PO-\d{4}-\d{6}$/);
    expect(created.data?.status).toBe(PurchaseOrderStatus.Draft);
    expect(created.data?.subtotal).toBe(38684);
    expect(created.data?.taxes).toBe(100);
    expect(created.data?.freight).toBe(500);
    expect(created.data?.total).toBe(39284);
    expect(created.data?.balanceQuantity).toBe(100);
    expect(created.data?.items[0]?.balanceQuantity).toBe(100);
    expect(created.data?.rootPurchaseOrderId).toBe(created.data?.id);
  });

  it('runs Draft → Approval → Issued → Partially → Fully → Closed', async () => {
    const created = await createDraft();
    const id = created.data!.id;

    await service.submitForApproval(id, actorId);
    expect((await service.getById(id)).data?.status).toBe(
      PurchaseOrderStatus.PendingApproval,
    );

    const issued = await service.approve(id, { comment: 'OK' }, actorId);
    expect(issued.data?.status).toBe(PurchaseOrderStatus.Issued);

    const lineId = issued.data!.items[0]!.id;
    const partial = await service.recordReceipt(
      id,
      { items: [{ lineId, receivedQuantity: 40 }] },
      actorId,
    );
    expect(partial.data?.status).toBe(PurchaseOrderStatus.PartiallyReceived);
    expect(partial.data?.balanceQuantity).toBe(60);

    const full = await service.recordReceipt(
      id,
      { items: [{ lineId, receivedQuantity: 60 }] },
      actorId,
    );
    expect(full.data?.status).toBe(PurchaseOrderStatus.FullyReceived);
    expect(full.data?.balanceQuantity).toBe(0);

    const closed = await service.close(id, actorId);
    expect(closed.data?.status).toBe(PurchaseOrderStatus.Closed);
  });

  it('versions issued PO on revise and blocks in-place edit', async () => {
    const issued = await createIssued();
    const id = issued.data!.id;

    await expect(
      service.update(id, { freight: 999 }, actorId),
    ).rejects.toThrow(/Only draft POs can be edited/);

    const revised = await service.revise(
      id,
      {
        items: [
          {
            materialId,
            quantity: 120,
            unit: MaterialUnit.Bag,
            rate: 375,
            tax: 0,
          },
        ],
      },
      actorId,
    );

    expect(revised.data?.revisionNumber).toBe(2);
    expect(revised.data?.status).toBe(PurchaseOrderStatus.Draft);
    expect(revised.data?.revisedFromId).toBe(id);
    expect((await service.getById(id)).data?.status).toBe(
      PurchaseOrderStatus.Superseded,
    );
  });

  it('enforces receive tolerance and maintains balance endpoint', async () => {
    const issued = await createIssued();
    const id = issued.data!.id;
    const lineId = issued.data!.items[0]!.id;

    await expect(
      service.recordReceipt(
        id,
        { items: [{ lineId, receivedQuantity: 106 }] },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);

    await service.recordReceipt(
      id,
      { items: [{ lineId, receivedQuantity: 105 }] },
      actorId,
    );
    const balance = await service.getBalance(id);
    expect(balance.data?.balanceQuantity).toBe(-5);
    expect(balance.data?.lines[0]?.receivedQuantity).toBe(105);
  });

  it('generates PO PDF', async () => {
    const created = await createDraft();
    const exported = await service.exportPdf(created.data!.id, actorId);
    expect(exported.data?.pdfPath).toMatch(/^uploads\/purchase-orders\//);
    const absolute = join(process.cwd(), exported.data!.pdfPath!);
    expect(existsSync(absolute)).toBe(true);
    rmSync(join(process.cwd(), 'uploads', 'purchase-orders'), {
      recursive: true,
      force: true,
    });
  });

  it('cancels draft PO', async () => {
    const created = await createDraft();
    const cancelled = await service.cancel(created.data!.id, actorId);
    expect(cancelled.data?.status).toBe(PurchaseOrderStatus.Cancelled);
  });
});
