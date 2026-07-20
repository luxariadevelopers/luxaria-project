import type { ListStockCountsQuery } from './types';

export const stockCountsKeys = {
  all: ['stock-counts'] as const,
  lists: () => [...stockCountsKeys.all, 'list'] as const,
  list: (query: ListStockCountsQuery) =>
    [...stockCountsKeys.lists(), query] as const,
  details: () => [...stockCountsKeys.all, 'detail'] as const,
  detail: (id: string) => [...stockCountsKeys.details(), id] as const,
};
