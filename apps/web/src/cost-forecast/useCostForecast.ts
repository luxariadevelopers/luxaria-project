import { useQueries } from '@tanstack/react-query';
import { latestGeneratedAt } from './deriveCostForecast';
import {
  fetchProjectCostSheet,
  fetchProjectDashboardCosts,
} from './api';
import { costForecastQueryKey } from './queryKeys';
import type { CostForecastQuery, CostForecastViewModel } from './types';

type Options = {
  enabled?: boolean;
  canViewReport?: boolean;
  canViewDashboard?: boolean;
};

export function useCostForecast(
  query: CostForecastQuery | null,
  {
    enabled = true,
    canViewReport = true,
    canViewDashboard = true,
  }: Options = {},
) {
  const ready = Boolean(query?.projectId) && enabled;

  const results = useQueries({
    queries: [
      {
        queryKey: [...costForecastQueryKey(query ?? { projectId: '' }), 'sheet'],
        queryFn: () => fetchProjectCostSheet(query!),
        enabled: ready && canViewReport,
        staleTime: 30_000,
        retry: false,
      },
      {
        queryKey: [
          ...costForecastQueryKey(query ?? { projectId: '' }),
          'dashboard',
        ],
        queryFn: () => fetchProjectDashboardCosts(query!),
        enabled: ready && canViewDashboard,
        staleTime: 30_000,
        retry: false,
      },
    ],
  });

  const [sheetQuery, dashboardQuery] = results;

  const viewModel: CostForecastViewModel = {
    dashboard: dashboardQuery.data ?? null,
    costSheet: sheetQuery.data ?? null,
    calculatedAt: latestGeneratedAt([sheetQuery.data?.meta.generatedAt]),
  };

  return {
    viewModel,
    sheetQuery,
    dashboardQuery,
    isLoading: sheetQuery.isLoading || dashboardQuery.isLoading,
    isFetching: sheetQuery.isFetching || dashboardQuery.isFetching,
    isError: sheetQuery.isError || dashboardQuery.isError,
    error: sheetQuery.error ?? dashboardQuery.error,
    refetch: () =>
      Promise.all([sheetQuery.refetch(), dashboardQuery.refetch()]),
  };
}
