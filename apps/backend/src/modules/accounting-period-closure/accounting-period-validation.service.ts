import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  BankReconciliationSessionStatus,
} from '../bank-reconciliation/bank-reconciliation.constants';
import { BankReconciliationSession } from '../bank-reconciliation/schemas/bank-reconciliation-session.schema';
import {
  CashAccount,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import {
  JournalEntry,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import { MaterialConsumptionAlert } from '../material-consumption/material-consumption.validation';
import {
  MaterialConsumptionReport,
  MaterialConsumptionReportStatus,
} from '../material-consumption/schemas/material-consumption-report.schema';
import {
  SiteExpenseVoucher,
  SiteExpenseVoucherStatus,
} from '../site-expense-vouchers/schemas/site-expense-voucher.schema';
import {
  StockCount,
  StockCountStatus,
} from '../stock-counts/schemas/stock-count.schema';
import {
  VendorInvoice,
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  PERIOD_CHECKLIST_DEFINITIONS,
  PeriodChecklistItemKey,
  PeriodChecklistItemStatus,
  type PeriodChecklistIssue,
  type PeriodChecklistItem,
} from './accounting-period-closure.constants';

const MONEY_EPS = 0.005;
const ISSUE_CAP = 25;

export type PeriodValidationResult = {
  checklist: PeriodChecklistItem[];
  validationPassed: boolean;
  failedCount: number;
};

@Injectable()
export class AccountingPeriodValidationService {
  constructor(
    @InjectModel(JournalEntry.name)
    private readonly journalModel: Model<JournalEntry>,
    @InjectModel(BankReconciliationSession.name)
    private readonly bankReconModel: Model<BankReconciliationSession>,
    @InjectModel(CashAccount.name)
    private readonly cashModel: Model<CashAccount>,
    @InjectModel(SiteExpenseVoucher.name)
    private readonly expenseModel: Model<SiteExpenseVoucher>,
    @InjectModel(VendorInvoice.name)
    private readonly vendorInvoiceModel: Model<VendorInvoice>,
    @InjectModel(StockCount.name)
    private readonly stockCountModel: Model<StockCount>,
    @InjectModel(MaterialConsumptionReport.name)
    private readonly materialConsumptionModel: Model<MaterialConsumptionReport>,
  ) {}

  async runValidations(
    periodFrom: Date,
    periodTo: Date,
  ): Promise<PeriodValidationResult> {
    const [
      unpostedJournals,
      pendingBankRecon,
      negativeCash,
      unapprovedExpenses,
      unmatchedInvoices,
      openStockAdjustments,
      unresolvedVariance,
    ] = await Promise.all([
      this.checkUnpostedJournals(periodFrom, periodTo),
      this.checkPendingBankReconciliation(periodFrom, periodTo),
      this.checkNegativeCashBalances(periodTo),
      this.checkUnapprovedExpenses(periodFrom, periodTo),
      this.checkUnmatchedVendorInvoices(periodFrom, periodTo),
      this.checkOpenStockAdjustments(periodFrom, periodTo),
      this.checkUnresolvedMaterialVariance(periodFrom, periodTo),
    ]);

    const byKey: Record<PeriodChecklistItemKey, PeriodChecklistItem> = {
      [PeriodChecklistItemKey.UnpostedJournals]: unpostedJournals,
      [PeriodChecklistItemKey.PendingBankReconciliation]: pendingBankRecon,
      [PeriodChecklistItemKey.NegativeCashBalance]: negativeCash,
      [PeriodChecklistItemKey.UnapprovedExpenses]: unapprovedExpenses,
      [PeriodChecklistItemKey.UnmatchedVendorInvoices]: unmatchedInvoices,
      [PeriodChecklistItemKey.OpenStockAdjustments]: openStockAdjustments,
      [PeriodChecklistItemKey.UnresolvedMaterialVariance]: unresolvedVariance,
    };

    const checklist = PERIOD_CHECKLIST_DEFINITIONS.map((d) => byKey[d.key]);
    const failedCount = checklist.filter(
      (c) => c.status === PeriodChecklistItemStatus.Failed,
    ).length;

    return {
      checklist,
      validationPassed: failedCount === 0,
      failedCount,
    };
  }

  private item(
    key: PeriodChecklistItemKey,
    issues: PeriodChecklistIssue[],
  ): PeriodChecklistItem {
    const def = PERIOD_CHECKLIST_DEFINITIONS.find((d) => d.key === key)!;
    return {
      key,
      label: def.label,
      status:
        issues.length === 0
          ? PeriodChecklistItemStatus.Passed
          : PeriodChecklistItemStatus.Failed,
      issueCount: issues.length,
      issues: issues.slice(0, ISSUE_CAP),
      checkedAt: new Date(),
    };
  }

  private async checkUnpostedJournals(
    from: Date,
    to: Date,
  ): Promise<PeriodChecklistItem> {
    const rows = await this.journalModel
      .find({
        journalDate: { $gte: from, $lte: to },
        status: {
          $in: [JournalStatus.Draft, JournalStatus.PendingApproval],
        },
      })
      .select('_id journalNumber status journalDate')
      .limit(ISSUE_CAP)
      .lean()
      .exec();

    return this.item(
      PeriodChecklistItemKey.UnpostedJournals,
      rows.map((r) => ({
        entityType: 'journal_entry',
        entityId: String(r._id),
        reference: r.journalNumber,
        detail: `Journal ${r.journalNumber} is ${r.status}`,
      })),
    );
  }

  private async checkPendingBankReconciliation(
    from: Date,
    to: Date,
  ): Promise<PeriodChecklistItem> {
    const rows = await this.bankReconModel
      .find({
        status: {
          $in: [
            BankReconciliationSessionStatus.Draft,
            BankReconciliationSessionStatus.InProgress,
          ],
        },
        statementFrom: { $lte: to },
        statementTo: { $gte: from },
      })
      .select('_id sessionNumber status')
      .limit(ISSUE_CAP)
      .lean()
      .exec();

    return this.item(
      PeriodChecklistItemKey.PendingBankReconciliation,
      rows.map((r) => ({
        entityType: 'bank_reconciliation_session',
        entityId: String(r._id),
        reference: r.sessionNumber,
        detail: `Bank reconciliation ${r.sessionNumber} is ${r.status}`,
      })),
    );
  }

  private async checkNegativeCashBalances(
    asOf: Date,
  ): Promise<PeriodChecklistItem> {
    const accounts = await this.cashModel
      .find({
        status: {
          $in: [CashAccountStatus.Active, CashAccountStatus.PendingHandover],
        },
      })
      .select('_id accountCode ledgerAccountId openingBalance')
      .lean()
      .exec();

    const issues: PeriodChecklistIssue[] = [];
    for (const acc of accounts) {
      const [agg] = await this.journalModel
        .aggregate<{ debit: number; credit: number }>([
          {
            $match: {
              status: JournalStatus.Posted,
              journalDate: { $lte: asOf },
              'lines.accountId': acc.ledgerAccountId,
            },
          },
          { $unwind: '$lines' },
          { $match: { 'lines.accountId': acc.ledgerAccountId } },
          {
            $group: {
              _id: null,
              debit: { $sum: '$lines.debit' },
              credit: { $sum: '$lines.credit' },
            },
          },
        ])
        .exec();

      const balance =
        Math.round(
          ((acc.openingBalance ?? 0) +
            (agg?.debit ?? 0) -
            (agg?.credit ?? 0)) *
            100,
        ) / 100;

      if (balance < -MONEY_EPS) {
        issues.push({
          entityType: 'cash_account',
          entityId: String(acc._id),
          reference: acc.accountCode,
          detail: `Cash account ${acc.accountCode} has negative balance ${balance}`,
        });
      }
      if (issues.length >= ISSUE_CAP) break;
    }

    return this.item(PeriodChecklistItemKey.NegativeCashBalance, issues);
  }

  private async checkUnapprovedExpenses(
    from: Date,
    to: Date,
  ): Promise<PeriodChecklistItem> {
    const rows = await this.expenseModel
      .find({
        expenseDate: { $gte: from, $lte: to },
        status: {
          $in: [
            SiteExpenseVoucherStatus.Submitted,
            SiteExpenseVoucherStatus.Verified,
            SiteExpenseVoucherStatus.Approved,
          ],
        },
      })
      .select('_id voucherNumber status expenseDate')
      .limit(ISSUE_CAP)
      .lean()
      .exec();

    return this.item(
      PeriodChecklistItemKey.UnapprovedExpenses,
      rows.map((r) => ({
        entityType: 'site_expense_voucher',
        entityId: String(r._id),
        reference: (r as { voucherNumber?: string }).voucherNumber ?? null,
        detail: `Expense voucher is ${r.status} (not posted)`,
      })),
    );
  }

  private async checkUnmatchedVendorInvoices(
    from: Date,
    to: Date,
  ): Promise<PeriodChecklistItem> {
    const rows = await this.vendorInvoiceModel
      .find({
        invoiceDate: { $gte: from, $lte: to },
        status: { $ne: VendorInvoiceStatus.Cancelled },
        matchingStatus: {
          $in: [
            VendorInvoiceMatchingStatus.Pending,
            VendorInvoiceMatchingStatus.Exception,
            VendorInvoiceMatchingStatus.Rejected,
          ],
        },
      })
      .select('_id invoiceNumber matchingStatus status')
      .limit(ISSUE_CAP)
      .lean()
      .exec();

    return this.item(
      PeriodChecklistItemKey.UnmatchedVendorInvoices,
      rows.map((r) => ({
        entityType: 'vendor_invoice',
        entityId: String(r._id),
        reference: (r as { invoiceNumber?: string }).invoiceNumber ?? null,
        detail: `Vendor invoice matching status is ${r.matchingStatus}`,
      })),
    );
  }

  private async checkOpenStockAdjustments(
    from: Date,
    to: Date,
  ): Promise<PeriodChecklistItem> {
    const rows = await this.stockCountModel
      .find({
        countDate: { $gte: from, $lte: to },
        status: {
          $in: [
            StockCountStatus.Draft,
            StockCountStatus.Submitted,
            StockCountStatus.Reviewed,
            StockCountStatus.Approved,
          ],
        },
      })
      .select('_id countNumber status countDate')
      .limit(ISSUE_CAP)
      .lean()
      .exec();

    return this.item(
      PeriodChecklistItemKey.OpenStockAdjustments,
      rows.map((r) => ({
        entityType: 'stock_count',
        entityId: String(r._id),
        reference: (r as { countNumber?: string }).countNumber ?? null,
        detail: `Stock count is ${r.status} (adjustment not posted)`,
      })),
    );
  }

  private async checkUnresolvedMaterialVariance(
    from: Date,
    to: Date,
  ): Promise<PeriodChecklistItem> {
    const varianceAlerts = [
      MaterialConsumptionAlert.AboveAllowedVariance,
      MaterialConsumptionAlert.NegativeConsumption,
      MaterialConsumptionAlert.UnexplainedStockShortage,
    ];

    const rows = await this.materialConsumptionModel
      .find({
        status: {
          $in: [
            MaterialConsumptionReportStatus.Draft,
            MaterialConsumptionReportStatus.Submitted,
          ],
        },
        asOfDate: { $gte: from, $lte: to },
        $or: [
          { requiresApproval: true },
          { 'lines.alerts': { $in: varianceAlerts } },
          {
            'lines.requiresApproval': true,
            'lines.explanation': null,
          },
        ],
      })
      .select('_id reportNumber status requiresApproval')
      .limit(ISSUE_CAP)
      .lean()
      .exec();

    return this.item(
      PeriodChecklistItemKey.UnresolvedMaterialVariance,
      rows.map((r) => ({
        entityType: 'material_consumption_report',
        entityId: String(r._id),
        reference: r.reportNumber,
        detail: `Material consumption ${r.reportNumber} has unresolved variance (${r.status})`,
      })),
    );
  }
}
