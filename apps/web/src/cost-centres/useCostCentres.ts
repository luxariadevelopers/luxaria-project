import { useQuery } from '@tanstack/react-query';
import { fetchCostCentres } from './api';
import { costCentresKeys } from './queryKeys';
import type { ListCostCentresQuery } from './types';

export function useCostCentresList(query: ListCostCentresQuery, enabled = true) {
  return useQuery({
    queryKey: costCentresKeys.list(query),
    queryFn: () => fetchCostCentres(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
