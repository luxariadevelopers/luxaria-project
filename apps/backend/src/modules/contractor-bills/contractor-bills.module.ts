import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Account,
  AccountSchema,
} from '../chart-of-accounts/schemas/account.schema';
import {
  ContractorAgreement,
  ContractorAgreementSchema,
} from '../contractor-agreements/schemas/contractor-agreement.schema';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import { FinancialYearModule } from '../financial-year/financial-year.module';
import { JournalModule } from '../journal/journal.module';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from '../work-measurements/schemas/work-measurement.schema';
import { ContractorBillsController } from './contractor-bills.controller';
import { ContractorBillsService } from './contractor-bills.service';
import {
  ContractorBill,
  ContractorBillSchema,
} from './schemas/contractor-bill.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContractorBill.name, schema: ContractorBillSchema },
      { name: ContractorAgreement.name, schema: ContractorAgreementSchema },
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Contractor.name, schema: ContractorSchema },
      { name: Account.name, schema: AccountSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
    ]),
    RbacModule,
    JournalModule,
    FinancialYearModule,
  ],
  controllers: [ContractorBillsController],
  providers: [ContractorBillsService],
  exports: [ContractorBillsService, MongooseModule],
})
export class ContractorBillsModule {}
