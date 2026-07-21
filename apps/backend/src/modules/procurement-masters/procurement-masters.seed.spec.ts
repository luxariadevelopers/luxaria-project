import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { ProcurementMastersService } from './procurement-masters.service';
import {
  DEFAULT_DELIVERY_TERMS,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_TAX_RULES,
} from './procurement-masters.seed';
import {
  DeliveryTerm,
  DeliveryTermSchema,
} from './schemas/delivery-term.schema';
import {
  MaterialCategory,
  MaterialCategorySchema,
} from './schemas/material-category.schema';
import {
  PaymentTerm,
  PaymentTermSchema,
} from './schemas/payment-term.schema';
import {
  PreferredVendor,
  PreferredVendorSchema,
} from './schemas/preferred-vendor.schema';
import {
  PurchaseCategory,
  PurchaseCategorySchema,
} from './schemas/purchase-category.schema';
import { TaxRule, TaxRuleSchema } from './schemas/tax-rule.schema';
import {
  VendorCategory,
  VendorCategorySchema,
} from './schemas/vendor-category.schema';
import {
  VendorPriceList,
  VendorPriceListSchema,
} from './schemas/vendor-price-list.schema';

describe('ProcurementMastersService.seedDefaults', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: ProcurementMastersService;
  let companyId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const purchaseCategoryModel = connection.model(
      PurchaseCategory.name,
      PurchaseCategorySchema,
    ) as Model<PurchaseCategory>;
    const materialCategoryModel = connection.model(
      MaterialCategory.name,
      MaterialCategorySchema,
    ) as Model<MaterialCategory>;
    const vendorCategoryModel = connection.model(
      VendorCategory.name,
      VendorCategorySchema,
    ) as Model<VendorCategory>;
    const paymentTermModel = connection.model(
      PaymentTerm.name,
      PaymentTermSchema,
    ) as Model<PaymentTerm>;
    const deliveryTermModel = connection.model(
      DeliveryTerm.name,
      DeliveryTermSchema,
    ) as Model<DeliveryTerm>;
    const taxRuleModel = connection.model(
      TaxRule.name,
      TaxRuleSchema,
    ) as Model<TaxRule>;
    const preferredVendorModel = connection.model(
      PreferredVendor.name,
      PreferredVendorSchema,
    ) as Model<PreferredVendor>;
    const vendorPriceListModel = connection.model(
      VendorPriceList.name,
      VendorPriceListSchema,
    ) as Model<VendorPriceList>;

    service = new ProcurementMastersService(
      purchaseCategoryModel,
      materialCategoryModel,
      vendorCategoryModel,
      paymentTermModel,
      deliveryTermModel,
      taxRuleModel,
      preferredVendorModel,
      vendorPriceListModel,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    companyId = new Types.ObjectId().toHexString();
    await Promise.all([
      connection.model(PaymentTerm.name).deleteMany({}),
      connection.model(DeliveryTerm.name).deleteMany({}),
      connection.model(TaxRule.name).deleteMany({}),
    ]);
  });

  it('seeds payment terms, delivery terms, and tax rules idempotently', async () => {
    const first = await service.seedDefaults(companyId);
    expect(first.data?.created).toBe(
      DEFAULT_PAYMENT_TERMS.length +
        DEFAULT_DELIVERY_TERMS.length +
        DEFAULT_TAX_RULES.length,
    );
    expect(first.data?.skipped).toBe(0);

    const second = await service.seedDefaults(companyId);
    expect(second.data?.created).toBe(0);
    expect(second.data?.skipped).toBe(
      DEFAULT_PAYMENT_TERMS.length +
        DEFAULT_DELIVERY_TERMS.length +
        DEFAULT_TAX_RULES.length,
    );

    const paymentCodes = (
      await connection.model(PaymentTerm.name).find({}).lean().exec()
    ).map((r) => r.code);
    expect(paymentCodes.sort()).toEqual(
      DEFAULT_PAYMENT_TERMS.map((d) => d.code).sort(),
    );

    const deliveryCodes = (
      await connection.model(DeliveryTerm.name).find({}).lean().exec()
    ).map((r) => r.code);
    expect(deliveryCodes.sort()).toEqual(
      DEFAULT_DELIVERY_TERMS.map((d) => d.code).sort(),
    );

    const taxCodes = (
      await connection.model(TaxRule.name).find({}).lean().exec()
    ).map((r) => r.code);
    expect(taxCodes.sort()).toEqual(
      DEFAULT_TAX_RULES.map((d) => d.code).sort(),
    );
  });
});
