import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  GoodsReceipt,
  GoodsReceiptSchema,
  GoodsReceiptStatus,
} from '../goods-receipts/schemas/goods-receipt.schema';
import type { JournalService } from '../journal/journal.service';
import {
  Material,
  MaterialSchema,
  MaterialStatus,
  MaterialUnit,
} from '../material-master/schemas/material.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  Vendor,
  VendorSchema,
  VendorStatus,
  VendorVerificationStatus,
} from '../vendors/schemas/vendor.schema';
import {
  VendorInvoice,
  VendorInvoiceMatchingStatus,
  VendorInvoiceSchema,
  VendorInvoiceStatus,
} from './schemas/vendor-invoice.schema';
import { VendorInvoicesService } from './vendor-invoices.service';

const address = {
  line1: 'Industrial Estate',
  line2: null,
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  country: 'India',
};

describe('VendorInvoicesService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: VendorInvoicesService;
  let invoiceModel: Model<VendorInvoice>;
  let poModel: Model<PurchaseOrder>;
  let grnModel: Model<GoodsReceipt>;
  let materialModel: Model<Material>;
  let vendorModel: Model<Vendor>;
  let accountModel: Model<Account>;
  let journalCreate: jest.Mock;

  let actorId: string;
  let vendorId: string;
  let projectId: string;
  let materialId: string;
  let purchaseOrderId: string;
  let poLineId: string;
  let grnId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    invoiceModel = connection.model(
      VendorInvoice.name,
      VendorInvoiceSchema,
    ) as Model<VendorInvoice>;
    poModel = connection.model(
      PurchaseOrder.name,
      PurchaseOrderSchema,
    ) as Model<PurchaseOrder>;
    grnModel = connection.model(
      GoodsReceipt.name,
      GoodsReceiptSchema,
    ) as Model<GoodsReceipt>;
    materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    vendorModel = connection.model(Vendor.name, VendorSchema) as Model<Vendor>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      invoiceModel.syncIndexes(),
      poModel.syncIndexes(),
      grnModel.syncIndexes(),
      materialModel.syncIndexes(),
      vendorModel.syncIndexes(),
      accountModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const configService = {
      get: jest.fn((key: string) => {
        if (
          key === 'vendorInvoiceQtyTolerancePercent' ||
          key === 'vendorInvoiceRateTolerancePercent' ||
          key === 'vendorInvoiceTaxTolerancePercent' ||
          key === 'vendorInvoiceFreightTolerancePercent' ||
          key === 'vendorInvoiceDiscountTolerancePercent' ||
          key === 'vendorInvoiceTotalTolerancePercent'
        ) {
          return 0;
        }
        return undefined;
      }),
    } as unknown as ConfigService<never, true>;

    journalCreate = jest.fn().mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });
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


    service = new VendorInvoicesService(
      invoiceModel,
      poModel,
      grnModel,
      materialModel,
      vendorModel,
      accountModel,
      new NumberingService(counterModel),
      { create: journalCreate } as unknown as JournalService,
      configService,
      mockProjectScope
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    projectId = new Types.ObjectId().toHexString();
    journalCreate.mockClear();

    await invoiceModel.deleteMany({}).setOptions({ withDeleted: true });
    await poModel.deleteMany({}).setOptions({ withDeleted: true });
    await grnModel.deleteMany({}).setOptions({ withDeleted: true });
    await materialModel.deleteMany({}).setOptions({ withDeleted: true });
    await vendorModel.deleteMany({}).setOptions({ withDeleted: true });
    await accountModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [vendor] = await vendorModel.create([
      {
        vendorCode: 'VEN-000001',
        legalName: 'Southern Steels',
        status: VendorStatus.Active,
        verificationStatus: VendorVerificationStatus.Verified,
        materialCategories: ['cement'],
      },
    ]);
    vendorId = String(vendor._id);

    const [material] = await materialModel.create([
      {
        materialCode: 'MAT-000001',
        name: 'OPC Cement',
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

    const [po] = await poModel.create([
      {
        purchaseOrderNumber: 'PO-2026-000001',
        projectId: new Types.ObjectId(projectId),
        purchaseRequestId: new Types.ObjectId(),
        selectedQuotationId: new Types.ObjectId(),
        vendorId: new Types.ObjectId(vendorId),
        orderDate: new Date('2026-07-01'),
        expectedDeliveryDate: new Date('2026-07-20'),
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
            rate: 400,
            tax: 0,
            discount: 0,
            total: 40000,
            receivedQuantity: 10,
            balanceQuantity: 90,
          },
        ],
        subtotal: 40000,
        taxes: 0,
        freight: 0,
        discount: 0,
        total: 40000,
        terms: null,
        status: PurchaseOrderStatus.PartiallyReceived,
        revisionNumber: 1,
        balanceQuantity: 90,
        balanceAmount: 36000,
      },
    ]);
    purchaseOrderId = String(po._id);
    poLineId = String(po.items[0]!._id);

    const [grn] = await grnModel.create([
      {
        grnNumber: 'GRN-2026-000001',
        projectId: new Types.ObjectId(projectId),
        purchaseOrderId: new Types.ObjectId(purchaseOrderId),
        vendorId: new Types.ObjectId(vendorId),
        receivedDate: new Date('2026-07-10'),
        receivedBy: new Types.ObjectId(actorId),
        latitude: 13.08,
        longitude: 80.27,
        photos: ['photo.jpg'],
        items: [
          {
            materialId: material._id,
            materialCode: material.materialCode,
            materialName: material.name,
            purchaseOrderLineId: new Types.ObjectId(poLineId),
            orderedQuantity: 100,
            receivedQuantity: 10,
            acceptedQuantity: 10,
            rejectedQuantity: 0,
            unit: MaterialUnit.Bag,
          },
        ],
        status: GoodsReceiptStatus.Posted,
      },
    ]);
    grnId = String(grn._id);

    await accountModel.create([
      {
        accountCode: '1150',
        accountName: 'WIP',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.WorkInProgress,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '1180',
        accountName: 'Input GST',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.InputGst,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '2100',
        accountName: 'Vendor Payable',
        accountType: AccountType.Liability,
        accountCategory: AccountCategory.VendorPayable,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '2110',
        accountName: 'TDS Payable',
        accountType: AccountType.Liability,
        accountCategory: AccountCategory.TdsPayable,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '2120',
        accountName: 'Retention Payable',
        accountType: AccountType.Liability,
        accountCategory: AccountCategory.RetentionPayable,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
    ]);
  });

  async function createDraft(overrides: {
    invoiceNumber?: string;
    quantity?: number;
    rate?: number;
  } = {}) {
    const quantity = overrides.quantity ?? 10;
    const rate = overrides.rate ?? 400;
    const taxableValue = quantity * rate;
    return service.create(
      {
        invoiceNumber: overrides.invoiceNumber ?? 'VEN-INV-001',
        vendorId,
        projectId,
        purchaseOrderId,
        grnIds: [grnId],
        invoiceDate: '2026-07-17',
        dueDate: '2026-08-16',
        taxableValue,
        gst: 0,
        tds: 0,
        retention: 0,
        freight: 0,
        totalAmount: taxableValue,
        items: [
          {
            materialId,
            purchaseOrderLineId: poLineId,
            quantity,
            unit: MaterialUnit.Bag,
            rate,
          },
        ],
      },
      actorId,
    );
  }

  it('detects duplicate vendor invoice numbers', async () => {
    await createDraft({ invoiceNumber: 'DUP-1' });
    await expect(createDraft({ invoiceNumber: 'dup-1' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('matches GRN qty and PO rate, then posts through workflow', async () => {
    const created = await createDraft();
    expect(created.data?.documentNumber).toMatch(/^VI-/);
    expect(created.data?.status).toBe(VendorInvoiceStatus.Draft);

    await service.submit(created.data!.id, actorId);
    await service.verify(created.data!.id, actorId);
    const matched = await service.match(created.data!.id, actorId);

    expect(matched.data?.status).toBe(VendorInvoiceStatus.Matching);
    expect(matched.data?.matchingStatus).toBe(
      VendorInvoiceMatchingStatus.Matched,
    );
    expect(matched.data?.items[0]?.grnAcceptedQuantity).toBe(10);
    expect(matched.data?.items[0]?.poRate).toBe(400);
    expect(matched.data?.variances).toHaveLength(0);

    await service.approve(matched.data!.id, actorId);
    const posted = await service.post(matched.data!.id, actorId);
    expect(posted.data?.status).toBe(VendorInvoiceStatus.Posted);
    expect(posted.data?.journalEntryId).toBeTruthy();
    expect(journalCreate).toHaveBeenCalled();
  });

  it('flags quantity and rate variances as exceptions', async () => {
    const created = await createDraft({ quantity: 15, rate: 450 });
    await service.submit(created.data!.id, actorId);
    await service.verify(created.data!.id, actorId);
    const matched = await service.match(created.data!.id, actorId);

    expect(matched.data?.matchingStatus).toBe(
      VendorInvoiceMatchingStatus.Exception,
    );
    expect(matched.data?.variances.length).toBeGreaterThanOrEqual(2);
    expect(
      matched.data?.variances.some((v) => v.type === 'quantity'),
    ).toBe(true);
    expect(matched.data?.variances.some((v) => v.type === 'rate')).toBe(true);

    await expect(
      service.approve(matched.data!.id, actorId),
    ).rejects.toThrow(/exceptionApprovalComment/);

    const approved = await service.approve(matched.data!.id, actorId, {
      exceptionApprovalComment: 'Director override for shortage',
    });
    expect(approved.data?.status).toBe(VendorInvoiceStatus.Approval);
    expect(approved.data?.exceptionApproved).toBe(true);
  });

  it('rejects matching and blocks payment until matched', async () => {
    const created = await createDraft();
    await service.submit(created.data!.id, actorId);
    await service.verify(created.data!.id, actorId);
    const matched = await service.match(created.data!.id, actorId);

    const rejected = await service.rejectMatching(matched.data!.id, actorId, {
      reason: 'GRN photos incomplete',
    });
    expect(rejected.data?.matchingStatus).toBe(
      VendorInvoiceMatchingStatus.Rejected,
    );

    await expect(
      service.approve(rejected.data!.id, actorId),
    ).rejects.toThrow(/Rejected matching/);

    // Re-match after rejection
    const rematched = await service.match(rejected.data!.id, actorId);
    expect(rematched.data?.matchingStatus).toBe(
      VendorInvoiceMatchingStatus.Matched,
    );
    await service.approve(rematched.data!.id, actorId);
    await service.post(rematched.data!.id, actorId);

    // Force exception without approval via direct update, then payment must block
    await invoiceModel.updateOne(
      { _id: rematched.data!.id },
      {
        $set: {
          matchingStatus: VendorInvoiceMatchingStatus.Exception,
          exceptionApproved: false,
        },
      },
    );
    await expect(service.markPaid(rematched.data!.id, actorId)).rejects.toThrow(
      /exceptions require approval/,
    );

    await invoiceModel.updateOne(
      { _id: rematched.data!.id },
      {
        $set: {
          matchingStatus: VendorInvoiceMatchingStatus.Matched,
          exceptionApproved: false,
        },
      },
    );
    const paid = await service.markPaid(rematched.data!.id, actorId);
    expect(paid.data?.status).toBe(VendorInvoiceStatus.Paid);
  });
});
