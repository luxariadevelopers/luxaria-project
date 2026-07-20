import type { ListStockLedgerQuery } from './types';

export const stockLedgerKeys = {
  all: ['stock-ledger'] as const,
  lists: () => [...stockLedgerKeys.all, 'list'] as const,
  list: (query: ListStockLedgerQuery) =>
    [...stockLedgerKeys.lists(), query] as const,
  details: () => [...stockLedgerKeys.all, 'detail'] as const,
  detail: (id: string) => [...stockLedgerKeys.details(), id] as const,
};
