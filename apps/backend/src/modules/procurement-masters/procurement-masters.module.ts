import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RbacModule } from '../rbac/rbac.module';
import { ProcurementMastersController } from './procurement-masters.controller';
import { ProcurementMastersService } from './procurement-masters.service';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseCategory.name, schema: PurchaseCategorySchema },
      { name: MaterialCategory.name, schema: MaterialCategorySchema },
      { name: VendorCategory.name, schema: VendorCategorySchema },
      { name: PaymentTerm.name, schema: PaymentTermSchema },
      { name: DeliveryTerm.name, schema: DeliveryTermSchema },
      { name: TaxRule.name, schema: TaxRuleSchema },
      { name: PreferredVendor.name, schema: PreferredVendorSchema },
      { name: VendorPriceList.name, schema: VendorPriceListSchema },
    ]),
    RbacModule,
  ],
  controllers: [ProcurementMastersController],
  providers: [ProcurementMastersService],
  exports: [ProcurementMastersService, MongooseModule],
})
export class ProcurementMastersModule {}
