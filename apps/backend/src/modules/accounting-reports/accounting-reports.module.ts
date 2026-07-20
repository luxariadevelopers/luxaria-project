import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Account,
  AccountSchema,
} from '../chart-of-accounts/schemas/account.schema';
import {
  ContractorBill,
  ContractorBillSchema,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import {
  Customer,
  CustomerSchema,
} from '../customers/schemas/customer.schema';
import {
  Director,
  DirectorSchema,
} from '../directors/schemas/director.schema';
import {
  FinancialYear,
  FinancialYearSchema,
} from '../financial-year/schemas/financial-year.schema';
import {
  Investor,
  InvestorSchema,
} from '../investors/schemas/investor.schema';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import {
  PaymentSchedule,
  PaymentScheduleSchema,
} from '../payment-schedules/schemas/payment-schedule.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import {
  VendorInvoice,
  VendorInvoiceSchema,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { AccountingReportsExportService } from './accounting-reports-export.service';
import { AccountingReportsController } from './accounting-reports.controller';
import { AccountingReportsService } from './accounting-reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Account.name, schema: AccountSchema },
      { name: FinancialYear.name, schema: FinancialYearSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: VendorInvoice.name, schema: VendorInvoiceSchema },
      { name: ContractorBill.name, schema: ContractorBillSchema },
      { name: PaymentSchedule.name, schema: PaymentScheduleSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: Contractor.name, schema: ContractorSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Director.name, schema: DirectorSchema },
      { name: Investor.name, schema: InvestorSchema },
    ]),
    ProjectAccessModule,
  ],
  controllers: [AccountingReportsController],
  providers: [AccountingReportsService, AccountingReportsExportService],
  exports: [AccountingReportsService, AccountingReportsExportService],
})
export class AccountingReportsModule {}
