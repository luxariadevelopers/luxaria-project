import type { AccountingReportType } from './accounting-reports.constants';

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
  reportType: AccountingReportType;
  title: string;
  filters: ReportFiltersApplied;
  generatedAt: string;
  reconciled: boolean;
  reconciliationNotes: string[];
};

export type TrialBalanceRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
  drillDown: DrillDownLink[];
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

export type JournalRegisterRow = {
  journalId: string;
  journalNumber: string;
  journalDate: string;
  narration: string;
  projectId: string | null;
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  lineCount: number;
  drillDown: DrillDownLink[];
};

export type CostSheetRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountCategory: string;
  amount: number;
  drillDown: DrillDownLink[];
};

export type ProfitAndLossSection = {
  section: 'income' | 'expense';
  rows: CostSheetRow[];
  total: number;
};

export type BalanceSheetSection = {
  section: 'assets' | 'liabilities' | 'equity';
  rows: CostSheetRow[];
  total: number;
};

export type PartyLedgerRow = LedgerLineRow & {
  partyName: string | null;
};

export type AgeingBucketRow = {
  partyId: string;
  partyName: string | null;
  partyType: 'vendor' | 'contractor' | 'customer';
  current: number;
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90Plus: number;
  total: number;
  drillDown: DrillDownLink[];
};

export type FundLine = {
  label: string;
  amount: number;
  accountCategory?: string | null;
  drillDown: DrillDownLink[];
};

export type AccountingReportPayload = {
  meta: ReportMeta;
  totals?: Record<string, number>;
  rows?: unknown[];
  sections?: unknown;
  [key: string]: unknown;
};
