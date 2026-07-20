export enum AccountingPeriodType {
  Monthly = 'monthly',
  FinancialYear = 'financial_year',
}

export enum AccountingPeriodStatus {
  Open = 'open',
  Locked = 'locked',
  Closed = 'closed',
}

export enum PeriodChecklistItemKey {
  UnpostedJournals = 'unposted_journals',
  PendingBankReconciliation = 'pending_bank_reconciliation',
  NegativeCashBalance = 'negative_cash_balance',
  UnapprovedExpenses = 'unapproved_expenses',
  UnmatchedVendorInvoices = 'unmatched_vendor_invoices',
  OpenStockAdjustments = 'open_stock_adjustments',
  UnresolvedMaterialVariance = 'unresolved_material_variance',
}

export enum PeriodChecklistItemStatus {
  Pending = 'pending',
  Passed = 'passed',
  Failed = 'failed',
}

export enum PeriodReopenRequestStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export const PERIOD_CHECKLIST_DEFINITIONS: Array<{
  key: PeriodChecklistItemKey;
  label: string;
}> = [
  {
    key: PeriodChecklistItemKey.UnpostedJournals,
    label: 'Unposted journals',
  },
  {
    key: PeriodChecklistItemKey.PendingBankReconciliation,
    label: 'Pending bank reconciliation',
  },
  {
    key: PeriodChecklistItemKey.NegativeCashBalance,
    label: 'Negative cash balance',
  },
  {
    key: PeriodChecklistItemKey.UnapprovedExpenses,
    label: 'Unapproved expenses',
  },
  {
    key: PeriodChecklistItemKey.UnmatchedVendorInvoices,
    label: 'Unmatched vendor invoices',
  },
  {
    key: PeriodChecklistItemKey.OpenStockAdjustments,
    label: 'Open stock adjustments',
  },
  {
    key: PeriodChecklistItemKey.UnresolvedMaterialVariance,
    label: 'Unresolved material variance',
  },
];

export type PeriodChecklistIssue = {
  entityType: string;
  entityId: string;
  reference: string | null;
  detail: string;
};

export type PeriodChecklistItem = {
  key: PeriodChecklistItemKey;
  label: string;
  status: PeriodChecklistItemStatus;
  issueCount: number;
  issues: PeriodChecklistIssue[];
  checkedAt: Date | null;
};
