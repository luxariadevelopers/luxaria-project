import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BankReconciliationSession,
  BankReconciliationSessionSchema,
} from '../bank-reconciliation/schemas/bank-reconciliation-session.schema';
import {
  CashAccount,
  CashAccountSchema,
} from '../cash-accounts/schemas/cash-account.schema';
import { FinancialYearModule } from '../financial-year/financial-year.module';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import {
  MaterialConsumptionReport,
  MaterialConsumptionReportSchema,
} from '../material-consumption/schemas/material-consumption-report.schema';
import {
  SiteExpenseVoucher,
  SiteExpenseVoucherSchema,
} from '../site-expense-vouchers/schemas/site-expense-voucher.schema';
import {
  StockCount,
  StockCountSchema,
} from '../stock-counts/schemas/stock-count.schema';
import {
  VendorInvoice,
  VendorInvoiceSchema,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import { AccountingPeriodClosureController } from './accounting-period-closure.controller';
import { AccountingPeriodClosureService } from './accounting-period-closure.service';
import { AccountingPeriodValidationService } from './accounting-period-validation.service';
import {
  AccountingPeriod,
  AccountingPeriodSchema,
} from './schemas/accounting-period.schema';
import {
  PeriodReopenRequest,
  PeriodReopenRequestSchema,
} from './schemas/period-reopen-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AccountingPeriod.name, schema: AccountingPeriodSchema },
      { name: PeriodReopenRequest.name, schema: PeriodReopenRequestSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      {
        name: BankReconciliationSession.name,
        schema: BankReconciliationSessionSchema,
      },
      { name: CashAccount.name, schema: CashAccountSchema },
      { name: SiteExpenseVoucher.name, schema: SiteExpenseVoucherSchema },
      { name: VendorInvoice.name, schema: VendorInvoiceSchema },
      { name: StockCount.name, schema: StockCountSchema },
      {
        name: MaterialConsumptionReport.name,
        schema: MaterialConsumptionReportSchema,
      },
    ]),
    FinancialYearModule,
  ],
  controllers: [AccountingPeriodClosureController],
  providers: [
    AccountingPeriodClosureService,
    AccountingPeriodValidationService,
  ],
  exports: [AccountingPeriodClosureService, MongooseModule],
})
export class AccountingPeriodClosureModule {}
