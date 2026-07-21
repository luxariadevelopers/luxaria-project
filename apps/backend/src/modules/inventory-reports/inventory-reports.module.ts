import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CostLayer, CostLayerSchema } from '../inventory-costing/schemas/cost-layer.schema';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
} from '../material-master/schemas/material-stock-transaction.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import {
  MaterialStockBalance,
  MaterialStockBalanceSchema,
} from '../stock-ledger/schemas/material-stock-balance.schema';
import { InventoryReportsController } from './inventory-reports.controller';
import { InventoryReportsService } from './inventory-reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MaterialStockTransaction.name,
        schema: MaterialStockTransactionSchema,
      },
      { name: MaterialStockBalance.name, schema: MaterialStockBalanceSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: CostLayer.name, schema: CostLayerSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [InventoryReportsController],
  providers: [InventoryReportsService],
  exports: [InventoryReportsService],
})
export class InventoryReportsModule {}
