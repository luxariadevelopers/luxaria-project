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
