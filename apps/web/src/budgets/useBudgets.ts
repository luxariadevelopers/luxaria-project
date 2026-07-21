import { useQuery } from '@tanstack/react-query';
import { fetchBudgets } from './api';
import { budgetsKeys } from './queryKeys';
import type { ListBudgetsQuery } from './types';

export function useBudgetsList(query: ListBudgetsQuery, enabled = true) {
  return useQuery({
    queryKey: budgetsKeys.list(query),
    queryFn: () => fetchBudgets(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
