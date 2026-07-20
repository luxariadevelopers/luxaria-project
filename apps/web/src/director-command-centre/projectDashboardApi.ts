import { apiGet } from '@/api/client';
import type {
  ProjectDashboardQuery,
  ProjectDashboardSummary,
} from './projectDashboardTypes';

/**
 * `GET /projects/:projectId/dashboard`
 * Permission: `dashboard.view` + project read access (`RequireProjectAccess`).
 */
export async function fetchProjectDashboard(
  projectId: string,
  query: ProjectDashboardQuery = {},
): Promise<ProjectDashboardSummary> {
  const res = await apiGet<ProjectDashboardSummary>(
    `/projects/${projectId}/dashboard`,
    { ...query },
  );
  if (!res.data) {
    throw new Error(res.message || 'Project dashboard unavailable');
  }
  return res.data;
}
