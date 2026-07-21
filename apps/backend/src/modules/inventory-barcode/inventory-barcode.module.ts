import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { StockLedgerModule } from '../stock-ledger/stock-ledger.module';
import { InventoryBarcodeController } from './inventory-barcode.controller';
import { InventoryBarcodeService } from './inventory-barcode.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
    ]),
    StockLedgerModule,
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [InventoryBarcodeController],
  providers: [InventoryBarcodeService],
  exports: [InventoryBarcodeService],
})
export class InventoryBarcodeModule {}
