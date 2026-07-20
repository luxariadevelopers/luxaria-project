import { Module } from '@nestjs/common';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Account,
  AccountSchema,
} from '../chart-of-accounts/schemas/account.schema';
import { JournalModule } from '../journal/journal.module';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import { RbacModule } from '../rbac/rbac.module';
import { StockLedgerModule } from '../stock-ledger/stock-ledger.module';
import { StockCount, StockCountSchema } from './schemas/stock-count.schema';
import { StockCountsController } from './stock-counts.controller';
import { StockCountsService } from './stock-counts.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockCount.name, schema: StockCountSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    StockLedgerModule,
    JournalModule,    ProjectAccessModule,

    RbacModule,
  ],
  controllers: [StockCountsController],
  providers: [StockCountsService],
  exports: [StockCountsService, MongooseModule],
})
export class StockCountsModule {}
