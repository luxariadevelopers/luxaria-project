import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { StockLedgerModule } from '../stock-ledger/stock-ledger.module';
import {
  StockTransfer,
  StockTransferSchema,
} from './schemas/stock-transfer.schema';
import { StockTransfersController } from './stock-transfers.controller';
import { StockTransfersService } from './stock-transfers.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockTransfer.name, schema: StockTransferSchema },
      { name: Material.name, schema: MaterialSchema },
    ]),
    StockLedgerModule,
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [StockTransfersController],
  providers: [StockTransfersService],
  exports: [StockTransfersService, MongooseModule],
})
export class StockTransfersModule {}
