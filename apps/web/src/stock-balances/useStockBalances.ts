import { useQuery } from '@tanstack/react-query';
import {
  fetchLocationScopedStockRows,
  fetchStockForecast,
  forecastToStockRows,
} from './api';
import {
  applyStockBalanceClientFilters,
  isolateStockRowsToProject,
} from './applyClientFilters';
import { stockBalancesKeys } from './queryKeys';
import type { StockBalanceFilterState, StockBalanceRow } from './types';

export function useStockForecast(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: stockBalancesKeys.forecast(projectId ?? '', {}),
    queryFn: () => fetchStockForecast({ projectId: projectId! }),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

/**
 * Availability rows for the active project.
 * Location filter uses `GET /stock-ledger/balance` per material (not ledger list).
 */
export function useStockBalanceRows(
  projectId: string | null | undefined,
  filters: StockBalanceFilterState,
  enabled = true,
) {
  const location = filters.location.trim();
  const forecastQuery = useStockForecast(projectId, enabled);

  const locationQuery = useQuery({
    queryKey: stockBalancesKeys.locationBalances(
      projectId ?? '',
      location,
    ),
    queryFn: () =>
      fetchLocationScopedStockRows({
        projectId: projectId!,
        location,
        forecasts: forecastQuery.data ?? [],
      }),
    enabled:
      Boolean(projectId) &&
      enabled &&
      Boolean(location) &&
      Boolean(forecastQuery.data),
    staleTime: 15_000,
    retry: false,
  });

  const baseRows: StockBalanceRow[] = (() => {
    if (!projectId) return [];
    if (location) {
      return isolateStockRowsToProject(locationQuery.data ?? [], projectId);
    }
    return isolateStockRowsToProject(
      forecastToStockRows(forecastQuery.data ?? []),
      projectId,
    );
  })();

  const rows = applyStockBalanceClientFilters(baseRows, filters);

  const isLoading = location
    ? forecastQuery.isLoading || locationQuery.isLoading
    : forecastQuery.isLoading;
  const isFetching = location
    ? forecastQuery.isFetching || locationQuery.isFetching
    : forecastQuery.isFetching;
  const error = location
    ? forecastQuery.error ?? locationQuery.error
    : forecastQuery.error;

  const refetch = async () => {
    await forecastQuery.refetch();
    if (location) {
      await locationQuery.refetch();
    }
  };

  return {
    rows,
    allRowCount: baseRows.length,
    isLoading,
    isFetching,
    error,
    refetch,
    forecastQuery,
    locationQuery,
  };
}
