import type { ListCashAccountsQuery } from './types';

export const cashAccountsKeys = {
  all: ['cash-accounts'] as const,
  list: (query: ListCashAccountsQuery) =>
    [...cashAccountsKeys.all, 'list', query] as const,
  detail: (id: string) => [...cashAccountsKeys.all, 'detail', id] as const,
  balance: (id: string) => [...cashAccountsKeys.all, 'balance', id] as const,
  balances: (ids: readonly string[]) =>
    [...cashAccountsKeys.all, 'balances', [...ids].sort()] as const,
};
