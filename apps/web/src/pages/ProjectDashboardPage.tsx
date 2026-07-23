import { useEffect, useMemo, useState } from 'react';
import {
  Link as RouterLink,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { todayIsoDate } from '@/finance-dashboard/FinanceFilters';
import { ProjectDashboardView } from '@/project-dashboard/ProjectDashboardView';
import { evaluateRouteProjectAccess } from '@/project-dashboard/routeProjectAccess';
import { useProjectDashboard } from '@/project-dashboard/useProjectDashboard';

/**
 * Single-project dashboard (Micro Phase 024).
 * Route: `/projects/:projectId/dashboard`
 * API: `GET /projects/:projectId/dashboard` — `dashboard.view` + project access.
 *
 * Route project id must equal the active header project and be authorised.
 */
export function ProjectDashboardPage() {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
  } = useProject();
  const [asOfDate, setAsOfDate] = useState(todayIsoDate);

  const canView = Boolean(access) && hasPermission('dashboard.view');
  const accessibleIds = useMemo(
    () => projects.map((p) => p.id),
    [projects],
  );

  const routeAccess = evaluateRouteProjectAccess({
    routeProjectId,
    selectedProjectId,
    accessibleProjectIds: accessibleIds,
  });

  // If the URL names an accessible project, activate it (header may still be
  // "All projects" after opening Dashboard from the project Edit screen).
  useEffect(() => {
    if (
      (routeAccess === 'no_selection' || routeAccess === 'mismatch') &&
      routeProjectId &&
      accessibleIds.includes(routeProjectId)
    ) {
      setSelectedProjectId(routeProjectId);
    }
  }, [routeAccess, routeProjectId, accessibleIds, setSelectedProjectId]);

  const queryEnabled = canView && routeAccess === 'ok';
  const dashboardQuery = useProjectDashboard(
    routeProjectId,
    { date: asOfDate || undefined },
    queryEnabled,
  );

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Project dashboard unavailable"
        message="You need the dashboard.view permission to open this project dashboard."
      />
    );
  }

  if (routeAccess === 'invalid_id') {
    return (
      <EmptyState
        title="Invalid project"
        description="The project id in the URL is not a valid identifier."
        actionLabel="Back to projects"
        onAction={() => navigate('/projects')}
      />
    );
  }

  if (routeAccess === 'unauthorised') {
    return (
      <PermissionDenied
        title="Project not authorised"
        message="You do not have access to this project. Choose an assigned project in the header, or open Project Dashboard from the menu after selecting one."
      />
    );
  }

  if (routeAccess === 'no_selection' || routeAccess === 'mismatch') {
    const target = projects.find((p) => p.id === routeProjectId);
    if (target) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      );
    }
    return (
      <EmptyState
        title="Select this project"
        description="Activate this project in the header to view its dashboard."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <Typography color="text.secondary">
          Project manager command screen — progress, budget, commitments,
          stock, labour, DPR alerts, cash and site photos.
        </Typography>
        <Button
          component={RouterLink}
          to="/projects"
          size="small"
          variant="text"
        >
          Projects list
        </Button>
      </Stack>

      {dashboardQuery.isError ? (
        <RetryPanel
          error={dashboardQuery.error}
          onRetry={() => void dashboardQuery.refetch()}
          forceRetry
        />
      ) : (
        <ProjectDashboardView
          summary={dashboardQuery.data}
          loading={dashboardQuery.isLoading || dashboardQuery.isFetching}
          asOfDate={asOfDate}
          onAsOfDateChange={setAsOfDate}
        />
      )}
    </Stack>
  );
}

/** Nav entry: `/projects/dashboard` → active project's dashboard URL. */
export function ProjectDashboardEntryPage() {
  const { selectedProjectId } = useProject();
  const { hasPermission, access } = useAuth();
  const canView = Boolean(access) && hasPermission('dashboard.view');

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Project dashboard unavailable"
        message="You need the dashboard.view permission to open this project dashboard."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header, then open Project Dashboard again."
      />
    );
  }

  return (
    <Navigate to={`/projects/${selectedProjectId}/dashboard`} replace />
  );
}
