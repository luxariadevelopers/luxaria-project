import { useQuery } from '@tanstack/react-query';
import { fetchUnitHandovers } from './api';
import { unitHandoversKeys } from './queryKeys';
import type { ListUnitHandoversQuery } from './types';

export function useUnitHandoversList(
  query: ListUnitHandoversQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: unitHandoversKeys.list(query),
    queryFn: () => fetchUnitHandovers(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
