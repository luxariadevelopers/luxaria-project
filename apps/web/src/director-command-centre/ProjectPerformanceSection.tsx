import { Stack, Typography } from '@mui/material';
import type { ProjectOption } from '@luxaria/shared-types';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { ProjectPerformanceTable } from './ProjectPerformanceTable';
import type { ProjectDashboardQuery } from './projectDashboardTypes';
import { useProjectPerformance } from './useProjectPerformance';

type Props = {
  /** Accessible projects (from project context / filters). */
  projects: readonly ProjectOption[];
  /** Optional single-project filter from Director Command Centre. */
  projectIdFilter?: string;
  dashboardQuery: ProjectDashboardQuery;
  canView: boolean;
};

/**
 * Multi-project operational / financial comparison using
 * `GET /projects/:projectId/dashboard` (Micro Phase 022).
 */
export function ProjectPerformanceSection({
  projects,
  projectIdFilter,
  dashboardQuery,
  canView,
}: Props) {
  const scoped = projectIdFilter
    ? projects.filter((p) => p.id === projectIdFilter)
    : projects;
  const projectIds = scoped.map((p) => p.id);

  const performance = useProjectPerformance(
    projectIds,
    dashboardQuery,
    canView && projectIds.length > 0,
  );

  if (!canView) {
    return (
      <PermissionDenied
        title="Project performance unavailable"
        message="You need the dashboard.view permission to compare project dashboards."
        showHomeLink={false}
      />
    );
  }

  return (
    <Stack spacing={1.5} data-testid="project-performance-section">
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: 1 }}
      >
        Project performance
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Per-project dashboard comparison (progress, cost variance, alerts).
        Stale as-of dates (before today UTC) are highlighted.
      </Typography>

      {projectIds.length === 0 ? (
        <EmptyState
          title="No projects in scope"
          description="Select an accessible project or ensure you have project access to compare performance."
        />
      ) : (
        <ProjectPerformanceTable
          rows={performance.rows}
          loading={performance.isLoading}
          onRetryAll={performance.refetchAll}
        />
      )}
    </Stack>
  );
}
