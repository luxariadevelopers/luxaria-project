import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
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
import { QuotationComparisonPdfService } from './quotation-comparison-pdf.service';
import { QuotationComparisonsService } from './quotation-comparisons.service';
import {
  QuotationComparison,
  QuotationComparisonSchema,
  QuotationComparisonStatus,
} from './schemas/quotation-comparison.schema';

describe('QuotationComparisonsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: QuotationComparisonsService;
  let purchaseRequestId: string;
  let vendorAId: string;
  let vendorBId: string;
  let quoteAId: string;
  let quoteBId: string;
  let actorId: string;
  let approvalsCreate: jest.Mock;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const comparisonModel = connection.model(
      QuotationComparison.name,
      QuotationComparisonSchema,
    ) as Model<QuotationComparison>;
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
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    connection.model(Project.name, ProjectSchema);
    connection.model(Account.name, AccountSchema);

    await Promise.all([
      comparisonModel.syncIndexes(),
      prModel.syncIndexes(),
      quotationModel.syncIndexes(),
      vendorModel.syncIndexes(),
      materialModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    approvalsCreate = jest.fn().mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });

    service = new QuotationComparisonsService(
      comparisonModel,
      prModel,
      quotationModel,
      vendorModel,
      new NumberingService(counterModel),
      { create: approvalsCreate } as never,
      new QuotationComparisonPdfService(),
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    approvalsCreate.mockClear();
    approvalsCreate.mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });

    await connection
      .model(QuotationComparison.name)
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

    const [vendorA, vendorB] = await connection.model(Vendor.name).create([
      {
        vendorCode: 'VEN-000001',
        legalName: 'Alpha Cement',
        rating: 4,
        paymentTerms: 'Net 30',
        status: VendorStatus.Active,
        verificationStatus: VendorVerificationStatus.Verified,
      },
      {
        vendorCode: 'VEN-000002',
        legalName: 'Beta Cement',
        rating: 3,
        paymentTerms: 'Net 45',
        status: VendorStatus.Active,
        verificationStatus: VendorVerificationStatus.Verified,
      },
    ]);
    vendorAId = String(vendorA._id);
    vendorBId = String(vendorB._id);

    const [quoteA, quoteB] = await connection
      .model(VendorQuotation.name)
      .create([
        {
          quotationNumber: 'VQ-2026-000001',
          purchaseRequestId: pr._id,
          projectId: project._id,
          vendorId: vendorA._id,
          quotationDate: new Date('2026-07-17'),
          validityDate: new Date('2026-08-17'),
          deliveryDays: 10,
          paymentTerms: 'Net 30',
          freight: 1000,
          taxes: 100,
          discount: 0,
          items: [
            {
              materialId: material._id,
              materialCode: material.materialCode,
              materialName: material.name,
              quantity: 100,
              unit: MaterialUnit.Bag,
              rate: 400,
              tax: 720,
              discount: 0,
              total: 40720,
            },
          ],
          itemsSubtotal: 40720,
          grandTotal: 41820,
          status: VendorQuotationStatus.Submitted,
          revisionNumber: 1,
          rootQuotationId: null,
        },
        {
          quotationNumber: 'VQ-2026-000002',
          purchaseRequestId: pr._id,
          projectId: project._id,
          vendorId: vendorB._id,
          quotationDate: new Date('2026-07-17'),
          validityDate: new Date('2026-08-17'),
          deliveryDays: 5,
          paymentTerms: 'Net 45',
          freight: 200,
          taxes: 50,
          discount: 100,
          items: [
            {
              materialId: material._id,
              materialCode: material.materialCode,
              materialName: material.name,
              quantity: 100,
              unit: MaterialUnit.Bag,
              rate: 350,
              tax: 630,
              discount: 0,
              total: 35630,
            },
          ],
          itemsSubtotal: 35630,
          grandTotal: 35780,
          status: VendorQuotationStatus.Submitted,
          revisionNumber: 1,
          rootQuotationId: null,
        },
      ]);
    quoteAId = String(quoteA._id);
    quoteBId = String(quoteB._id);
  });

  it('generates comparison statement with landed cost and vendor metrics', async () => {
    const generated = await service.generate(
      {
        purchaseRequestId,
        vendorHistory: [
          {
            vendorId: vendorAId,
            previousQuality: 4.5,
            previousDeliveryPerformance: 4,
          },
          {
            vendorId: vendorBId,
            previousQuality: 3,
            previousDeliveryPerformance: 2.5,
          },
        ],
      },
      actorId,
    );

    expect(generated.data?.comparisonNumber).toMatch(/^QC-\d{4}-\d{6}$/);
    expect(generated.data?.vendors).toHaveLength(2);
    expect(generated.data?.lowestLandedCostQuotationId).toBe(quoteBId);

    const alpha = generated.data?.vendors.find((v) => v.vendorId === vendorAId);
    const beta = generated.data?.vendors.find((v) => v.vendorId === vendorBId);
    expect(alpha?.baseMaterialRate).toBe(400);
    expect(alpha?.gst).toBe(820); // 720 + 100
    expect(alpha?.freight).toBe(1000);
    expect(alpha?.netLandedCost).toBe(41820);
    expect(alpha?.vendorRating).toBe(4);
    expect(alpha?.previousQuality).toBe(4.5);
    expect(alpha?.isLowestLandedCost).toBe(false);

    expect(beta?.baseMaterialRate).toBe(350);
    expect(beta?.netLandedCost).toBe(35780);
    expect(beta?.deliveryDays).toBe(5);
    expect(beta?.isLowestLandedCost).toBe(true);
  });

  it('requires reason when recommending non-lowest vendor', async () => {
    const generated = await service.generate({ purchaseRequestId }, actorId);
    const id = generated.data!.id;

    await expect(
      service.recommend(id, { quotationId: quoteAId }, actorId),
    ).rejects.toThrow(/Reason is required/);

    const recommended = await service.recommend(
      id,
      {
        quotationId: quoteAId,
        reason: 'Superior previous quality and delivery record',
      },
      actorId,
    );
    expect(recommended.data?.status).toBe(QuotationComparisonStatus.Recommended);
    expect(recommended.data?.isLowestVendorSelected).toBe(false);
    expect(recommended.data?.recommendedQuotationId).toBe(quoteAId);
  });

  it('allows recommending lowest vendor without reason and submits approval', async () => {
    const generated = await service.generate({ purchaseRequestId }, actorId);
    const id = generated.data!.id;

    await service.recommend(id, { quotationId: quoteBId }, actorId);
    const submitted = await service.submitForApproval(id, actorId);

    expect(submitted.data?.status).toBe(
      QuotationComparisonStatus.PendingApproval,
    );
    expect(submitted.data?.approvalRequestId).toBeTruthy();
    expect(approvalsCreate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        module: 'procurement',
        entityType: 'quotation_comparison',
        entityId: id,
        submit: true,
      }),
      actorId,
    );
  });

  it('exports comparison PDF to disk', async () => {
    const generated = await service.generate({ purchaseRequestId }, actorId);
    const exported = await service.exportPdf(generated.data!.id, actorId);

    expect(exported.data?.pdfPath).toMatch(
      /^uploads\/quotation-comparisons\//,
    );
    expect(exported.data?.downloadPath).toBe(exported.data?.pdfPath);
    const absolute = join(process.cwd(), exported.data!.pdfPath!);
    expect(existsSync(absolute)).toBe(true);
    rmSync(join(process.cwd(), 'uploads', 'quotation-comparisons'), {
      recursive: true,
      force: true,
    });
  });

  it('rejects generate with fewer than two quotations', async () => {
    await connection.model(VendorQuotation.name).deleteOne({
      _id: quoteBId,
    });
    await expect(
      service.generate({ purchaseRequestId }, actorId),
    ).rejects.toThrow(BadRequestException);
  });
});
