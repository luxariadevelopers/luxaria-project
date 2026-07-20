import { useQuery } from '@tanstack/react-query';
import {
  fetchProjectDashboard,
} from '@/director-command-centre/projectDashboardApi';
import type { ProjectDashboardQuery } from '@/director-command-centre/projectDashboardTypes';
import { projectDashboardQueryKey } from '@/director-command-centre/useProjectPerformance';

export function useProjectDashboard(
  projectId: string | null | undefined,
  query: ProjectDashboardQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: projectDashboardQueryKey(projectId ?? '', query),
    queryFn: () => fetchProjectDashboard(projectId!, query),
    enabled: Boolean(projectId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}
