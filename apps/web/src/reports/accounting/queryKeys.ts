import type {
  AccountingBookKind,
  AccountingReportQuery,
  AccountingReportType,
  CashBankBookQuery,
} from './types';

export const accountingReportsKeys = {
  all: ['accounting-reports'] as const,
  catalogue: () => [...accountingReportsKeys.all, 'catalogue'] as const,
  report: (reportType: AccountingReportType, query: AccountingReportQuery) =>
    [...accountingReportsKeys.all, 'report', reportType, query] as const,
};

export const cashBankBookQueryKeys = {
  all: ['accounting-reports', 'cash-bank-book'] as const,
  report: (kind: AccountingBookKind, query: CashBankBookQuery) =>
    [...cashBankBookQueryKeys.all, 'report', kind, query] as const,
  accounts: (kind: AccountingBookKind) =>
    [...cashBankBookQueryKeys.all, 'accounts', kind] as const,
  financialYears: () =>
    [...cashBankBookQueryKeys.all, 'financial-years'] as const,
};
