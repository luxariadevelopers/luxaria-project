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
  PurchaseRequest,
  PurchaseRequestSchema,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
import { Rfq, RfqSchema, RfqStatus } from '../rfq/schemas/rfq.schema';
import {
  Vendor,
  VendorSchema,
  VendorStatus,
  VendorVerificationStatus,
} from '../vendors/schemas/vendor.schema';
import {
  VendorQuotation,
  VendorQuotationSchema,
} from './schemas/vendor-quotation.schema';
import { VendorQuotationsService } from './vendor-quotations.service';

describe('VendorQuotationsService RFQ link', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: VendorQuotationsService;
  let requireIssuedWithVendor: jest.Mock;
  let projectId: Types.ObjectId;
  let prId: string;
  let vendorId: string;
  let materialId: string;
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
    connection.model(Account.name, AccountSchema);
    connection.model(Rfq.name, RfqSchema);

    requireIssuedWithVendor = jest.fn();

    service = new VendorQuotationsService(
      quotationModel,
      prModel,
      vendorModel,
      materialModel,
      new NumberingService(counterModel),
      { requireIssuedWithVendor } as never,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    projectId = new Types.ObjectId();
    requireIssuedWithVendor.mockReset();

    await Promise.all([
      connection.model(VendorQuotation.name).deleteMany({}),
      connection.model(PurchaseRequest.name).deleteMany({}),
      connection.model(Vendor.name).deleteMany({}),
      connection.model(Material.name).deleteMany({}),
      connection.model(Account.name).deleteMany({}),
      connection.model(Counter.name).deleteMany({}),
    ]);

    const [account] = await connection.model(Account.name).create([
      {
        accountCode: 'EXP-MAT',
        accountName: 'Material',
        accountType: AccountType.Expense,
        accountCategory: AccountCategory.MaterialPurchase,
        level: 2,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
    ]);

    const [material] = await connection.model(Material.name).create([
      {
        materialCode: 'MAT-VQ',
        name: 'Cement',
        category: 'cement',
        baseUnit: MaterialUnit.Bag,
        status: MaterialStatus.Active,
        ledgerAccountId: account._id,
      },
    ]);
    materialId = String(material._id);

    const [pr] = await connection.model(PurchaseRequest.name).create([
      {
        requestNumber: 'PR-2026-000010',
        projectId,
        requestedBy: new Types.ObjectId(actorId),
        requiredByDate: new Date('2026-08-01'),
        items: [
          {
            materialId: material._id,
            requestedQuantity: 10,
            unit: MaterialUnit.Bag,
            currentStock: 0,
            reorderLevel: 0,
            minimumStock: 0,
            maximumStock: 0,
          },
        ],
        justification: 'Quote',
        status: PurchaseRequestStatus.Sourcing,
      },
    ]);
    prId = String(pr._id);

    const [vendor] = await connection.model(Vendor.name).create([
      {
        vendorCode: 'VEN-VQ',
        legalName: 'Quote Vendor',
        status: VendorStatus.Active,
        verificationStatus: VendorVerificationStatus.Verified,
      },
    ]);
    vendorId = String(vendor._id);
  });

  it('links quotation to RFQ when vendor is invited', async () => {
    const rfqId = new Types.ObjectId();
    requireIssuedWithVendor.mockResolvedValue({
      _id: rfqId,
      purchaseRequestId: new Types.ObjectId(prId),
      status: RfqStatus.Issued,
    });

    const created = await service.create(
      {
        purchaseRequestId: prId,
        rfqId: String(rfqId),
        vendorId,
        quotationDate: '2026-07-20',
        validityDate: '2026-08-20',
        items: [
          {
            materialId,
            quantity: 10,
            unit: MaterialUnit.Bag,
            rate: 380,
          },
        ],
      },
      actorId,
    );

    expect(requireIssuedWithVendor).toHaveBeenCalledWith(
      String(rfqId),
      vendorId,
    );
    expect(created.data?.rfqId).toBe(String(rfqId));
  });

  it('rejects RFQ link when validation fails', async () => {
    requireIssuedWithVendor.mockRejectedValue(
      new BadRequestException('Vendor is not invited on this RFQ'),
    );

    await expect(
      service.create(
        {
          purchaseRequestId: prId,
          rfqId: new Types.ObjectId().toHexString(),
          vendorId,
          quotationDate: '2026-07-20',
          validityDate: '2026-08-20',
          items: [
            {
              materialId,
              quantity: 10,
              unit: MaterialUnit.Bag,
              rate: 380,
            },
          ],
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
