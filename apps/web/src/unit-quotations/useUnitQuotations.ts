import { useQuery } from '@tanstack/react-query';
import { fetchUnitQuotations } from './api';
import { unitQuotationsKeys } from './queryKeys';
import type { ListUnitQuotationsQuery } from './types';

export function useUnitQuotationsList(
  query: ListUnitQuotationsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: unitQuotationsKeys.list(query),
    queryFn: () => fetchUnitQuotations(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
