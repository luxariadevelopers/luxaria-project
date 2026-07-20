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
  CustomerReceipt,
  CustomerReceiptSchema,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  DailyProgressReport,
  DailyProgressReportSchema,
  DprMissingAlert,
  DprMissingAlertSchema,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import {
  LabourAttendance,
  LabourAttendanceSchema,
} from '../labour-attendance/schemas/labour-attendance.schema';
import {
  ManpowerShortfallAlert,
  ManpowerShortfallAlertSchema,
} from '../manpower-planning/schemas/manpower-shortfall-alert.schema';
import {
  ContributionCommitment,
  ContributionCommitmentSchema,
} from '../project-commitments/schemas/contribution-commitment.schema';
import {
  ProjectParticipant,
  ProjectParticipantSchema,
} from '../project-participants/schemas/project-participant.schema';
import {
  ProjectFile,
  ProjectFileSchema,
} from '../projects/schemas/project-document.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  PurchaseRequest,
  PurchaseRequestSchema,
} from '../purchase-requests/schemas/purchase-request.schema';
import {
  MaterialStockBalance,
  MaterialStockBalanceSchema,
} from '../stock-ledger/schemas/material-stock-balance.schema';
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
import { ProjectDashboardController } from './project-dashboard.controller';
import { ProjectDashboardService } from './project-dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: BoqVersion.name, schema: BoqVersionSchema },
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
      { name: VendorInvoice.name, schema: VendorInvoiceSchema },
      { name: ContractorBill.name, schema: ContractorBillSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: CustomerReceipt.name, schema: CustomerReceiptSchema },
      { name: ContributionCommitment.name, schema: ContributionCommitmentSchema },
      { name: ProjectParticipant.name, schema: ProjectParticipantSchema },
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
      { name: CashAccount.name, schema: CashAccountSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: MaterialStockBalance.name, schema: MaterialStockBalanceSchema },
      { name: LabourAttendance.name, schema: LabourAttendanceSchema },
      { name: ProjectFile.name, schema: ProjectFileSchema },
      { name: DailyProgressReport.name, schema: DailyProgressReportSchema },
      { name: StockReorderAlert.name, schema: StockReorderAlertSchema },
      { name: ManpowerShortfallAlert.name, schema: ManpowerShortfallAlertSchema },
      { name: DprMissingAlert.name, schema: DprMissingAlertSchema },
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
    ]),
  ],
  controllers: [ProjectDashboardController],
  providers: [ProjectDashboardService],
  exports: [ProjectDashboardService],
})
export class ProjectDashboardModule {}
