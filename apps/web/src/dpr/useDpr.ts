import { useQuery } from '@tanstack/react-query';
import { fetchDailyProgressReports, fetchMissingDprAlerts } from './api';
import { dprKeys } from './queryKeys';
import type { ListDailyProgressReportsQuery } from './types';

export function useDailyProgressReportsList(
  query: ListDailyProgressReportsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: dprKeys.list(query),
    queryFn: () => fetchDailyProgressReports(query),
    enabled: Boolean(query.projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useMissingDprAlerts(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: dprKeys.missingAlerts(projectId ?? undefined),
    queryFn: () => fetchMissingDprAlerts(projectId ?? undefined),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}
