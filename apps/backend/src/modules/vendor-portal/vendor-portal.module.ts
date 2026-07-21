import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '../purchase-orders/schemas/purchase-order.schema';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { RbacModule } from '../rbac/rbac.module';
import { Rfq, RfqSchema } from '../rfq/schemas/rfq.schema';
import { VendorQuotationsModule } from '../vendor-quotations/vendor-quotations.module';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import { VendorPortalController } from './vendor-portal.controller';
import { VendorPortalService } from './vendor-portal.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vendor.name, schema: VendorSchema },
      { name: Rfq.name, schema: RfqSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
    ]),
    VendorQuotationsModule,
    PurchaseOrdersModule,
    RbacModule,
  ],
  controllers: [VendorPortalController],
  providers: [VendorPortalService],
  exports: [VendorPortalService],
})
export class VendorPortalModule {}
