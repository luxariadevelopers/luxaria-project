import { useQuery } from '@tanstack/react-query';
import { fetchOpeningBalancePacks } from './api';
import { openingBalancesKeys } from './queryKeys';
import type { ListOpeningBalancePacksQuery } from './types';

export function useOpeningBalancePacksList(
  query: ListOpeningBalancePacksQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: openingBalancesKeys.list(query),
    queryFn: () => fetchOpeningBalancePacks(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
