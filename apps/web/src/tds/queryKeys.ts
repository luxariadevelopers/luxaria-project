import type { ListTdsDeductionsQuery, ListTdsReturnsQuery } from './types';

export const tdsKeys = {
  all: ['tds'] as const,
  deductions: (query: ListTdsDeductionsQuery) =>
    [...tdsKeys.all, 'deductions', query] as const,
  returns: (query: ListTdsReturnsQuery) =>
    [...tdsKeys.all, 'returns', query] as const,
};
