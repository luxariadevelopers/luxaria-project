import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApprovalsModule } from '../approvals/approvals.module';
import { Material, MaterialSchema } from '../material-master/schemas/material.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import {
  PurchaseRequest,
  PurchaseRequestSchema,
} from '../purchase-requests/schemas/purchase-request.schema';
import { RbacModule } from '../rbac/rbac.module';
import { Role, RoleSchema } from '../rbac/schemas/role.schema';
import {
  VendorQuotation,
  VendorQuotationSchema,
} from '../vendor-quotations/schemas/vendor-quotation.schema';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import { PurchaseOrderPdfService } from './purchase-order-pdf.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersSeedService } from './purchase-orders.seed.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from './schemas/purchase-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: VendorQuotation.name, schema: VendorQuotationSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    ApprovalsModule,
    RbacModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [
    PurchaseOrdersService,
    PurchaseOrderPdfService,
    PurchaseOrdersSeedService,
  ],
  exports: [PurchaseOrdersService, MongooseModule],
})
export class PurchaseOrdersModule {}
