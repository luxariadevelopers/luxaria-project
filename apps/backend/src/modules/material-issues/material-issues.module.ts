import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import { StockLedgerModule } from '../stock-ledger/stock-ledger.module';
import { MaterialIssuesController } from './material-issues.controller';
import { MaterialIssuesService } from './material-issues.service';
import {
  MaterialIssue,
  MaterialIssueSchema,
} from './schemas/material-issue.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MaterialIssue.name, schema: MaterialIssueSchema },
      { name: Material.name, schema: MaterialSchema },
    ]),
    StockLedgerModule,
  ],
  controllers: [MaterialIssuesController],
  providers: [MaterialIssuesService],
  exports: [MaterialIssuesService, MongooseModule],
})
export class MaterialIssuesModule {}
