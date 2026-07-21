/** Nest accounting-reports cash/bank book contracts (Micro Phase 109). */

export type AccountingBookKind = 'cash-book' | 'bank-book';

export type DrillDownLink = {
  label: string;
  href: string;
  journalId?: string | null;
  sourceModule?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
};

export type ReportFiltersApplied = {
  financialYearId: string | null;
  financialYearName: string | null;
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;
  from: string | null;
  to: string | null;
  accountId: string | null;
  partyId: string | null;
};

export type ReportMeta = {
  reportType: AccountingBookKind | string;
  title: string;
  filters: ReportFiltersApplied;
  generatedAt: string;
  reconciled: boolean;
  reconciliationNotes: string[];
};

export type LedgerLineRow = {
  journalId: string;
  journalNumber: string;
  journalDate: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  narration: string;
  description: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
  projectId: string | null;
  partyType: string | null;
  partyId: string | null;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  drillDown: DrillDownLink[];
};

export type CashBankBookTotals = {
  debit: number;
  credit: number;
  openingBalance: number;
  closingBalance: number;
};

export type CashBankBookPayload = {
  meta: ReportMeta;
  openingBalance: number;
  closingBalance: number;
  rows: LedgerLineRow[];
  totals: CashBankBookTotals;
};

export type CashBankBookQuery = {
  financialYearId?: string;
  projectId?: string;
  from?: string;
  to?: string;
  accountId?: string;
};

export type BookFilterState = {
  financialYearId: string;
  projectId: string;
  from: string;
  to: string;
  accountId: string;
};

export type AccountOption = {
  id: string;
  accountCode: string;
  accountName: string;
  accountCategory: string;
};

/** Nest `AccountingReportType` + catalogue / payload shapes. */

export const AccountingReportType = {
  TrialBalance: 'trial-balance',
  GeneralLedger: 'general-ledger',
  JournalRegister: 'journal-register',
  CashBook: 'cash-book',
  BankBook: 'bank-book',
  ProjectCostSheet: 'project-cost-sheet',
  ProjectProfitAndLoss: 'project-profit-and-loss',
  BalanceSheet: 'balance-sheet',
  CompanyProfitAndLoss: 'company-profit-and-loss',
  VendorLedger: 'vendor-ledger',
  ContractorLedger: 'contractor-ledger',
  DirectorLedger: 'director-ledger',
  InvestorLedger: 'investor-ledger',
  CustomerLedger: 'customer-ledger',
  CustomerAdvanceReport: 'customer-advance-report',
  AccountsPayableAgeing: 'accounts-payable-ageing',
  AccountsReceivableAgeing: 'accounts-receivable-ageing',
  SourceAndUtilisationOfFunds: 'source-and-utilisation-of-funds',
  CashFlow: 'cash-flow',
  ProjectFundFlow: 'project-fund-flow',
} as const;

export type AccountingReportType =
  (typeof AccountingReportType)[keyof typeof AccountingReportType];

export const DEDICATED_ACCOUNTING_BOOK_REPORTS = [
  AccountingReportType.CashBook,
  AccountingReportType.BankBook,
] as const;

export const PROJECT_REQUIRED_ACCOUNTING_REPORTS = [
  AccountingReportType.ProjectCostSheet,
  AccountingReportType.ProjectProfitAndLoss,
  AccountingReportType.ProjectFundFlow,
] as const;

export type AccountingReportCatalogueItem = {
  reportType: AccountingReportType;
  title: string;
  path: string;
  exportPath: string;
};

export type AccountingReportQuery = {
  financialYearId?: string;
  projectId?: string;
  from?: string;
  to?: string;
  accountId?: string;
  partyId?: string;
};

export type AccountingReportPayload = {
  meta: ReportMeta;
  rows?: Record<string, unknown>[];
  totals?: Record<string, number | string | null> | null;
  sections?: unknown;
  openingBalance?: number;
  closingBalance?: number;
  [key: string]: unknown;
};

export type AccountingReportFilterState = {
  financialYearId: string;
  projectId: string;
  from: string;
  to: string;
  accountId: string;
  partyId: string;
};
