/** Mirrors Nest `AccountingPeriodType`. */
export const AccountingPeriodType = {
  Monthly: 'monthly',
  FinancialYear: 'financial_year',
} as const;
export type AccountingPeriodType =
  (typeof AccountingPeriodType)[keyof typeof AccountingPeriodType];

/** Mirrors Nest `AccountingPeriodStatus`. */
export const AccountingPeriodStatus = {
  Open: 'open',
  Locked: 'locked',
  Closed: 'closed',
} as const;
export type AccountingPeriodStatus =
  (typeof AccountingPeriodStatus)[keyof typeof AccountingPeriodStatus];

/** Mirrors Nest `PeriodChecklistItemStatus`. */
export const PeriodChecklistItemStatus = {
  Pending: 'pending',
  Passed: 'passed',
  Failed: 'failed',
} as const;
export type PeriodChecklistItemStatus =
  (typeof PeriodChecklistItemStatus)[keyof typeof PeriodChecklistItemStatus];

/** Mirrors Nest `PeriodReopenRequestStatus`. */
export const PeriodReopenRequestStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;
export type PeriodReopenRequestStatus =
  (typeof PeriodReopenRequestStatus)[keyof typeof PeriodReopenRequestStatus];

/** Mirrors Nest `PeriodChecklistItemKey`. */
export const PeriodChecklistItemKey = {
  UnpostedJournals: 'unposted_journals',
  PendingBankReconciliation: 'pending_bank_reconciliation',
  NegativeCashBalance: 'negative_cash_balance',
  UnapprovedExpenses: 'unapproved_expenses',
  UnmatchedVendorInvoices: 'unmatched_vendor_invoices',
  OpenStockAdjustments: 'open_stock_adjustments',
  UnresolvedMaterialVariance: 'unresolved_material_variance',
} as const;
export type PeriodChecklistItemKey =
  (typeof PeriodChecklistItemKey)[keyof typeof PeriodChecklistItemKey];

export type PeriodChecklistIssue = {
  entityType: string;
  entityId: string;
  reference: string | null;
  detail: string;
};

export type PeriodChecklistItem = {
  key: PeriodChecklistItemKey | string;
  label: string;
  status: PeriodChecklistItemStatus | string;
  issueCount: number;
  issues: PeriodChecklistIssue[];
  checkedAt: string | null;
};

/** Nest `toPublicPeriod`. */
export type PublicAccountingPeriod = {
  id: string;
  periodNumber: string;
  periodType: AccountingPeriodType | string;
  companyId: string | null;
  financialYearId: string;
  year: number | null;
  month: number | null;
  periodFrom: string;
  periodTo: string;
  status: AccountingPeriodStatus | string;
  validationRunAt: string | null;
  validationPassed: boolean;
  checklist: PeriodChecklistItem[];
  lockedAt: string | null;
  closedAt: string | null;
  notes: string | null;
};

export type PeriodChecklistPayload = {
  periodId: string;
  validationRunAt: string | null;
  validationPassed: boolean;
  checklist: PeriodChecklistItem[];
};

export type PreCloseValidationResult = PublicAccountingPeriod & {
  failedCount: number;
};

/** Nest `toPublicReopen`. */
export type PublicPeriodReopenRequest = {
  id: string;
  periodId: string;
  reason: string;
  requestedBy: string;
  status: PeriodReopenRequestStatus | string;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalNote: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string | null;
};

export type ApproveReopenResult = {
  request: PublicPeriodReopenRequest;
  period: PublicAccountingPeriod;
};

export type ListAccountingPeriodsQuery = {
  financialYearId?: string;
  periodType?: AccountingPeriodType | string;
  status?: AccountingPeriodStatus | string;
};

export type CreateAccountingPeriodInput = {
  periodType: AccountingPeriodType;
  financialYearId: string;
  month?: number;
  year?: number;
  companyId?: string;
  notes?: string;
};

export type RequestPeriodReopenInput = {
  reason: string;
};

export type ApprovePeriodReopenInput = {
  approvalNote?: string;
};

export type RejectPeriodReopenInput = {
  rejectionReason: string;
};
