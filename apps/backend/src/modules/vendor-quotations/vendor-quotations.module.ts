import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Material, MaterialSchema } from '../material-master/schemas/material.schema';
import {
  PurchaseRequest,
  PurchaseRequestSchema,
} from '../purchase-requests/schemas/purchase-request.schema';
import { RbacModule } from '../rbac/rbac.module';
import { RfqModule } from '../rfq/rfq.module';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import { VendorQuotationsController } from './vendor-quotations.controller';
import { VendorQuotationsService } from './vendor-quotations.service';
import {
  VendorQuotation,
  VendorQuotationSchema,
} from './schemas/vendor-quotation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VendorQuotation.name, schema: VendorQuotationSchema },
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: Material.name, schema: MaterialSchema },
    ]),
    forwardRef(() => RfqModule),
    RbacModule,
  ],
  controllers: [VendorQuotationsController],
  providers: [VendorQuotationsService],
  exports: [VendorQuotationsService, MongooseModule],
})
export class VendorQuotationsModule {}
