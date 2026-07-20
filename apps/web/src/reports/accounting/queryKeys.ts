import type { AccountingBookKind, CashBankBookQuery } from './types';

export const cashBankBookQueryKeys = {
  all: ['accounting-reports', 'cash-bank-book'] as const,
  report: (kind: AccountingBookKind, query: CashBankBookQuery) =>
    [...cashBankBookQueryKeys.all, 'report', kind, query] as const,
  accounts: (kind: AccountingBookKind) =>
    [...cashBankBookQueryKeys.all, 'accounts', kind] as const,
  financialYears: () =>
    [...cashBankBookQueryKeys.all, 'financial-years'] as const,
};
