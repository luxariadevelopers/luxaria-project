import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoqVersion, BoqVersionSchema } from '../boq/schemas/boq.schema';
import {
  CashAccount,
  CashAccountSchema,
} from '../cash-accounts/schemas/cash-account.schema';
import {
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import {
  ContractorBill,
  ContractorBillSchema,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import {
  CustomerReceipt,
  CustomerReceiptSchema,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  DprMissingAlert,
  DprMissingAlertSchema,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  FinancialYear,
  FinancialYearSchema,
} from '../financial-year/schemas/financial-year.schema';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import {
  ManpowerShortfallAlert,
  ManpowerShortfallAlertSchema,
} from '../manpower-planning/schemas/manpower-shortfall-alert.schema';
import {
  PaymentSchedule,
  PaymentScheduleSchema,
} from '../payment-schedules/schemas/payment-schedule.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import {
  ContributionCommitment,
  ContributionCommitmentSchema,
} from '../project-commitments/schemas/contribution-commitment.schema';
import {
  ProjectParticipant,
  ProjectParticipantSchema,
} from '../project-participants/schemas/project-participant.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import {
  PurchaseRequest,
  PurchaseRequestSchema,
} from '../purchase-requests/schemas/purchase-request.schema';
import {
  StockReorderAlert,
  StockReorderAlertSchema,
} from '../stock-reorder/schemas/stock-reorder-alert.schema';
import {
  VendorInvoice,
  VendorInvoiceSchema,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from '../work-measurements/schemas/work-measurement.schema';
import { DirectorCommandCentreController } from './director-command-centre.controller';
import { DirectorCommandCentreService } from './director-command-centre.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
      { name: CashAccount.name, schema: CashAccountSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: ContributionCommitment.name, schema: ContributionCommitmentSchema },
      { name: ProjectParticipant.name, schema: ProjectParticipantSchema },
      { name: CustomerReceipt.name, schema: CustomerReceiptSchema },
      { name: VendorInvoice.name, schema: VendorInvoiceSchema },
      { name: ContractorBill.name, schema: ContractorBillSchema },
      { name: PaymentSchedule.name, schema: PaymentScheduleSchema },
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: BoqVersion.name, schema: BoqVersionSchema },
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
      { name: StockReorderAlert.name, schema: StockReorderAlertSchema },
      { name: ManpowerShortfallAlert.name, schema: ManpowerShortfallAlertSchema },
      { name: Contractor.name, schema: ContractorSchema },
      { name: DprMissingAlert.name, schema: DprMissingAlertSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: FinancialYear.name, schema: FinancialYearSchema },
    ]),
    ProjectAccessModule,
  ],
  controllers: [DirectorCommandCentreController],
  providers: [DirectorCommandCentreService],
  exports: [DirectorCommandCentreService],
})
export class DirectorCommandCentreModule {}
