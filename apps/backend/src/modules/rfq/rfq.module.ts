import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import {
  PurchaseRequest,
  PurchaseRequestSchema,
} from '../purchase-requests/schemas/purchase-request.schema';
import { RbacModule } from '../rbac/rbac.module';
import { SitesModule } from '../sites/sites.module';
import {
  VendorQuotation,
  VendorQuotationSchema,
} from '../vendor-quotations/schemas/vendor-quotation.schema';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import { RfqController } from './rfq.controller';
import { RfqService } from './rfq.service';
import { Rfq, RfqSchema } from './schemas/rfq.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rfq.name, schema: RfqSchema },
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: VendorQuotation.name, schema: VendorQuotationSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    ProjectAccessModule,
    SitesModule,
    RbacModule,
  ],
  controllers: [RfqController],
  providers: [RfqService],
  exports: [RfqService, MongooseModule],
})
export class RfqModule {}
