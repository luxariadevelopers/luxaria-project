import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  GoodsReceipt,
  GoodsReceiptSchema,
} from '../goods-receipts/schemas/goods-receipt.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  PurchaseRequest,
  PurchaseRequestSchema,
} from '../purchase-requests/schemas/purchase-request.schema';
import { RbacModule } from '../rbac/rbac.module';
import { Rfq, RfqSchema } from '../rfq/schemas/rfq.schema';
import {
  VendorQuotation,
  VendorQuotationSchema,
} from '../vendor-quotations/schemas/vendor-quotation.schema';
import { ProcurementDashboardController } from './procurement-dashboard.controller';
import { ProcurementDashboardService } from './procurement-dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: Rfq.name, schema: RfqSchema },
      { name: VendorQuotation.name, schema: VendorQuotationSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: GoodsReceipt.name, schema: GoodsReceiptSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [ProcurementDashboardController],
  providers: [ProcurementDashboardService],
  exports: [ProcurementDashboardService],
})
export class ProcurementDashboardModule {}
