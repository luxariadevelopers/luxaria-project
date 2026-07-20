import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';
import { FinancialYearModule } from '../financial-year/financial-year.module';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import {
  JournalEntry,
  JournalEntrySchema,
} from './schemas/journal-entry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JournalEntry.name, schema: JournalEntrySchema },
    ]),
    ChartOfAccountsModule,
    FinancialYearModule,
    ProjectAccessModule,
  ],
  controllers: [JournalController],
  providers: [JournalService],
  exports: [JournalService, MongooseModule],
})
export class JournalModule {}
