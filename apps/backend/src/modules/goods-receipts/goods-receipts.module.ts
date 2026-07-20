import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaterialMasterModule } from '../material-master/material-master.module';
import { Material, MaterialSchema } from '../material-master/schemas/material.schema';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '../purchase-orders/schemas/purchase-order.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';
import {
  GoodsReceipt,
  GoodsReceiptSchema,
} from './schemas/goods-receipt.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GoodsReceipt.name, schema: GoodsReceiptSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Material.name, schema: MaterialSchema },
    ]),
    MaterialMasterModule,
    PurchaseOrdersModule,
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService],
  exports: [GoodsReceiptsService, MongooseModule],
})
export class GoodsReceiptsModule {}
