import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';
import { RbacModule } from '../rbac/rbac.module';
import { StockLedgerModule } from '../stock-ledger/stock-ledger.module';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
} from './schemas/material-stock-transaction.schema';
import { Material, MaterialSchema } from './schemas/material.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
      {
        name: MaterialStockTransaction.name,
        schema: MaterialStockTransactionSchema,
      },
    ]),
    ChartOfAccountsModule,
    RbacModule,
    forwardRef(() => StockLedgerModule),
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService, MongooseModule],
})
export class MaterialMasterModule {}
