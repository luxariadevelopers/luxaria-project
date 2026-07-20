import type { ListSiteExpenseVouchersQuery } from './types';

export const expensesKeys = {
  all: ['site-expense-vouchers'] as const,
  list: (query: ListSiteExpenseVouchersQuery) =>
    [...expensesKeys.all, 'list', query] as const,
  detail: (id: string) => [...expensesKeys.all, 'detail', id] as const,
};
