import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  evaluateStockReorder,
  fetchReorderAlerts,
  fetchStockForecast,
} from './api';
import { reorderAlertsKeys } from './queryKeys';
import type {
  EvaluateReorderInput,
  ForecastQuery,
  ListReorderAlertsQuery,
} from './types';

export function useReorderAlertsList(
  query: ListReorderAlertsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: reorderAlertsKeys.list(query),
    queryFn: () => fetchReorderAlerts(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useStockForecast(query: ForecastQuery, enabled = true) {
  return useQuery({
    queryKey: reorderAlertsKeys.forecast(query),
    queryFn: () => fetchStockForecast(query),
    enabled: Boolean(query.projectId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useEvaluateStockReorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EvaluateReorderInput = {}) =>
      evaluateStockReorder(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: reorderAlertsKeys.all });
    },
  });
}
