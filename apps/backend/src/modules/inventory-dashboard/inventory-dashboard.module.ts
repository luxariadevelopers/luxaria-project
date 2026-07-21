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
import {
  StockReservation,
  StockReservationSchema,
} from '../stock-reservations/schemas/stock-reservation.schema';
import { InventoryDashboardController } from './inventory-dashboard.controller';
import { InventoryDashboardService } from './inventory-dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MaterialStockBalance.name, schema: MaterialStockBalanceSchema },
      { name: Material.name, schema: MaterialSchema },
      {
        name: MaterialStockTransaction.name,
        schema: MaterialStockTransactionSchema,
      },
      { name: StockReservation.name, schema: StockReservationSchema },
      { name: CostLayer.name, schema: CostLayerSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [InventoryDashboardController],
  providers: [InventoryDashboardService],
  exports: [InventoryDashboardService],
})
export class InventoryDashboardModule {}
