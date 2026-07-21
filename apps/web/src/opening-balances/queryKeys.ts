import type { ListOpeningBalancePacksQuery } from './types';

export const openingBalancesKeys = {
  all: ['opening-balances'] as const,
  list: (query: ListOpeningBalancePacksQuery) =>
    [...openingBalancesKeys.all, 'list', query] as const,
};
