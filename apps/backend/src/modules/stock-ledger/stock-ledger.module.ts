import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
} from '../material-master/schemas/material-stock-transaction.schema';
import { RbacModule } from '../rbac/rbac.module';
import {
  MaterialStockBalance,
  MaterialStockBalanceSchema,
} from './schemas/material-stock-balance.schema';
import { StockLedgerController } from './stock-ledger.controller';
import { StockLedgerService } from './stock-ledger.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MaterialStockTransaction.name,
        schema: MaterialStockTransactionSchema,
      },
      {
        name: MaterialStockBalance.name,
        schema: MaterialStockBalanceSchema,
      },
      { name: Material.name, schema: MaterialSchema },
    ]),
    RbacModule,
  ],
  controllers: [StockLedgerController],
  providers: [StockLedgerService],
  exports: [StockLedgerService, MongooseModule],
})
export class StockLedgerModule {}
