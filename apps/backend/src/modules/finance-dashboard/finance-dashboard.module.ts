import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BankReconciliationSession,
  BankReconciliationSessionSchema,
} from '../bank-reconciliation/schemas/bank-reconciliation-session.schema';
import {
  BankStatementLine,
  BankStatementLineSchema,
} from '../bank-reconciliation/schemas/bank-statement-line.schema';
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
  ContractorPayment,
  ContractorPaymentSchema,
} from '../contractor-payments/schemas/contractor-payment.schema';
import {
  FinancialYear,
  FinancialYearSchema,
} from '../financial-year/schemas/financial-year.schema';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import {
  PaymentDemand,
  PaymentDemandSchema,
} from '../payment-schedules/schemas/payment-demand.schema';
import {
  PaymentSchedule,
  PaymentScheduleSchema,
} from '../payment-schedules/schemas/payment-schedule.schema';
import {
  PettyCashRequirement,
  PettyCashRequirementSchema,
} from '../petty-cash-requirements/schemas/petty-cash-requirement.schema';
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
  VendorInvoice,
  VendorInvoiceSchema,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  VendorPayment,
  VendorPaymentSchema,
} from '../vendor-payments/schemas/vendor-payment.schema';
import { FinanceDashboardExportService } from './finance-dashboard-export.service';
import { FinanceDashboardController } from './finance-dashboard.controller';
import { FinanceDashboardService } from './finance-dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
      { name: CashAccount.name, schema: CashAccountSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: VendorInvoice.name, schema: VendorInvoiceSchema },
      { name: ContractorBill.name, schema: ContractorBillSchema },
      { name: PaymentSchedule.name, schema: PaymentScheduleSchema },
      { name: PaymentDemand.name, schema: PaymentDemandSchema },
      { name: ContributionCommitment.name, schema: ContributionCommitmentSchema },
      { name: ProjectParticipant.name, schema: ProjectParticipantSchema },
      { name: VendorPayment.name, schema: VendorPaymentSchema },
      { name: ContractorPayment.name, schema: ContractorPaymentSchema },
      { name: PettyCashRequirement.name, schema: PettyCashRequirementSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: FinancialYear.name, schema: FinancialYearSchema },
      {
        name: BankReconciliationSession.name,
        schema: BankReconciliationSessionSchema,
      },
      { name: BankStatementLine.name, schema: BankStatementLineSchema },
    ]),
    ProjectAccessModule,
  ],
  controllers: [FinanceDashboardController],
  providers: [FinanceDashboardService, FinanceDashboardExportService],
  exports: [FinanceDashboardService],
})
export class FinanceDashboardModule {}
