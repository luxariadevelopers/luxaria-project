import { useQueries } from '@tanstack/react-query';
import { fetchProjectDashboard } from './projectDashboardApi';
import type { ProjectDashboardQuery } from './projectDashboardTypes';

export const projectDashboardQueryKey = (
  projectId: string,
  query: ProjectDashboardQuery,
) => ['project-dashboard', projectId, query] as const;

/**
 * Loads `GET /projects/:projectId/dashboard` for each accessible project.
 * Individual 403/errors surface per query — callers should not invent rows.
 */
export function useProjectPerformance(
  projectIds: readonly string[],
  query: ProjectDashboardQuery,
  enabled = true,
) {
  const results = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: projectDashboardQueryKey(projectId, query),
      queryFn: () => fetchProjectDashboard(projectId, query),
      enabled: enabled && Boolean(projectId),
      staleTime: 30_000,
      retry: false,
    })),
  });

  const isLoading =
    projectIds.length > 0 && results.some((r) => r.isLoading || r.isPending);
  const isFetching = results.some((r) => r.isFetching);
  const rows = results
    .map((r, index) => ({
      projectId: projectIds[index] ?? '',
      data: r.data,
      error: r.error,
      isError: r.isError,
      isLoading: r.isLoading || r.isPending,
      refetch: r.refetch,
    }))
    .filter((row) => row.projectId);

  const successCount = rows.filter((r) => r.data).length;
  const errorCount = rows.filter((r) => r.isError).length;

  const refetchAll = () => {
    void Promise.all(results.map((r) => r.refetch()));
  };

  return {
    rows,
    isLoading,
    isFetching,
    successCount,
    errorCount,
    refetchAll,
  };
}
