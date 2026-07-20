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
  Vendor,
  VendorSchema,
  VendorStatus,
  VendorVerificationStatus,
} from '../vendors/schemas/vendor.schema';
import { VendorQuotationsService } from './vendor-quotations.service';
import {
  VendorQuotation,
  VendorQuotationSchema,
  VendorQuotationStatus,
} from './schemas/vendor-quotation.schema';

describe('VendorQuotationsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: VendorQuotationsService;
  let materialId: string;
  let purchaseRequestId: string;
  let vendorAId: string;
  let vendorBId: string;
  let actorId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const quotationModel = connection.model(
      VendorQuotation.name,
      VendorQuotationSchema,
    ) as Model<VendorQuotation>;
    const prModel = connection.model(
      PurchaseRequest.name,
      PurchaseRequestSchema,
    ) as Model<PurchaseRequest>;
    const vendorModel = connection.model(
      Vendor.name,
      VendorSchema,
    ) as Model<Vendor>;
    const materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;

    await Promise.all([
      quotationModel.syncIndexes(),
      prModel.syncIndexes(),
      vendorModel.syncIndexes(),
      materialModel.syncIndexes(),
      counterModel.syncIndexes(),
      projectModel.syncIndexes(),
      accountModel.syncIndexes(),
    ]);

    service = new VendorQuotationsService(
      quotationModel,
      prModel,
      vendorModel,
      materialModel,
      new NumberingService(counterModel),
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
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

    const [pr] = await connection.model(PurchaseRequest.name).create([
      {
        requestNumber: 'PR-2026-000001',
        projectId: project._id,
        requestedBy: new Types.ObjectId(actorId),
        requiredByDate: new Date('2026-08-15'),
        priority: PurchaseRequestPriority.Normal,
        items: [
          {
            materialId: material._id,
            materialCode: material.materialCode,
            materialName: material.name,
            requestedQuantity: 100,
            unit: MaterialUnit.Bag,
            currentStock: 30,
            reorderLevel: 50,
            minimumStock: 20,
            maximumStock: 200,
            estimatedRate: 380,
            boqItemId: null,
            remarks: null,
            approvedQuantity: 100,
            lineStatus: 'approved',
            warnings: [],
          },
        ],
        justification: 'Slab pour',
        status: PurchaseRequestStatus.Sourcing,
      },
    ]);
    purchaseRequestId = String(pr._id);

    const [vendorA, vendorB] = await connection.model(Vendor.name).create([
      {
        vendorCode: 'VEN-000001',
        legalName: 'Alpha Cement',
        status: VendorStatus.Active,
        verificationStatus: VendorVerificationStatus.Verified,
      },
      {
        vendorCode: 'VEN-000002',
        legalName: 'Beta Cement',
        status: VendorStatus.Active,
        verificationStatus: VendorVerificationStatus.Verified,
      },
    ]);
    vendorAId = String(vendorA._id);
    vendorBId = String(vendorB._id);
  });

  async function createQuote(
    vendorId: string,
    overrides: {
      rate?: number;
      deliveryDays?: number;
      freight?: number;
      taxes?: number;
      discount?: number;
      quantity?: number;
      lineTax?: number;
      lineDiscount?: number;
    } = {},
  ) {
    return service.create(
      {
        purchaseRequestId,
        vendorId,
        quotationDate: '2026-07-17',
        validityDate: '2026-08-17',
        deliveryDays: overrides.deliveryDays ?? 7,
        paymentTerms: 'Net 30',
        freight: overrides.freight ?? 500,
        taxes: overrides.taxes ?? 0,
        discount: overrides.discount ?? 0,
        items: [
          {
            materialId,
            quantity: overrides.quantity ?? 100,
            unit: MaterialUnit.Bag,
            rate: overrides.rate ?? 380,
            tax: overrides.lineTax ?? 684,
            discount: overrides.lineDiscount ?? 0,
          },
        ],
      },
      actorId,
    );
  }

  it('creates quotation with VQ number and computed totals', async () => {
    const created = await createQuote(vendorAId);

    expect(created.data?.quotationNumber).toMatch(/^VQ-\d{4}-\d{6}$/);
    expect(created.data?.status).toBe(VendorQuotationStatus.Draft);
    expect(created.data?.items[0]?.total).toBe(38684); // 100*380 + 684
    expect(created.data?.itemsSubtotal).toBe(38684);
    expect(created.data?.grandTotal).toBe(39184); // + freight 500
    expect(created.data?.rootQuotationId).toBe(created.data?.id);
  });

  it('rejects quotation when PR is not approved/sourcing', async () => {
    await connection.model(PurchaseRequest.name).updateOne(
      { _id: purchaseRequestId },
      { status: PurchaseRequestStatus.Draft },
    );

    await expect(createQuote(vendorAId)).rejects.toThrow(BadRequestException);
  });

  it('uploads quotation document metadata', async () => {
    const created = await createQuote(vendorAId);
    const uploaded = await service.uploadDocument(
      created.data!.id,
      {
        fileName: 'alpha-quote.pdf',
        filePath: 'uploads/vendor-quotations/x/alpha-quote.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
      },
      actorId,
    );

    expect(uploaded.data?.quotationDocument?.fileName).toBe('alpha-quote.pdf');
    expect(uploaded.data?.quotationDocument?.mimeType).toBe('application/pdf');
  });

  it('revises quotation: supersedes previous and opens new draft revision', async () => {
    const created = await createQuote(vendorAId, { rate: 400 });
    const id = created.data!.id;
    await service.submit(id, actorId);

    const revised = await service.revise(
      id,
      { items: [{ materialId, quantity: 100, unit: MaterialUnit.Bag, rate: 360 }] },
      actorId,
    );

    expect(revised.data?.revisionNumber).toBe(2);
    expect(revised.data?.status).toBe(VendorQuotationStatus.Draft);
    expect(revised.data?.revisedFromId).toBe(id);
    expect(revised.data?.items[0]?.rate).toBe(360);

    const previous = await service.getById(id);
    expect(previous.data?.status).toBe(VendorQuotationStatus.Superseded);
  });

  it('marks final quotation and demotes prior final on same PR', async () => {
    const a = await createQuote(vendorAId, { rate: 380 });
    const b = await createQuote(vendorBId, { rate: 370 });
    await service.submit(a.data!.id, actorId);
    await service.submit(b.data!.id, actorId);

    await service.markFinal(a.data!.id, actorId);
    expect((await service.getById(a.data!.id)).data?.status).toBe(
      VendorQuotationStatus.Final,
    );

    await service.markFinal(b.data!.id, actorId);
    expect((await service.getById(b.data!.id)).data?.status).toBe(
      VendorQuotationStatus.Final,
    );
    expect((await service.getById(a.data!.id)).data?.status).toBe(
      VendorQuotationStatus.Submitted,
    );
  });

  it('compares quotations with lowest rate and grand total winners', async () => {
    const a = await createQuote(vendorAId, {
      rate: 400,
      deliveryDays: 10,
      freight: 1000,
    });
    const b = await createQuote(vendorBId, {
      rate: 350,
      deliveryDays: 5,
      freight: 200,
    });
    await service.submit(a.data!.id, actorId);
    await service.submit(b.data!.id, actorId);

    const comparison = await service.compare({ purchaseRequestId });
    expect(comparison.data?.quotations).toHaveLength(2);
    expect(comparison.data?.lines[0]?.lowestRate).toBe(350);
    expect(comparison.data?.lines[0]?.lowestRateQuotationId).toBe(b.data!.id);
    expect(comparison.data?.lowestGrandTotalQuotationId).toBe(b.data!.id);
    expect(comparison.data?.fastestDeliveryQuotationId).toBe(b.data!.id);
  });

  it('requires submit before mark-final', async () => {
    const created = await createQuote(vendorAId);
    await expect(service.markFinal(created.data!.id, actorId)).rejects.toThrow(
      /submitted/,
    );
  });
});
