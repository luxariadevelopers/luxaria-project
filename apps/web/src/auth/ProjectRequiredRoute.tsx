import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, type ReactNode } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { NoProjectAccessPage } from '@/pages/NoProjectAccessPage';
import { isMongoObjectId } from '@/project-dashboard/routeProjectAccess';

/**
 * Route wrapper for project-scoped screens.
 * Ensures a valid active project (access + workflow status) before rendering.
 * When the URL includes `:projectId`, activate that project automatically if
 * the user can access it (so deep links like /projects/:id/dashboard work
 * even when the header is still on "All projects").
 */
export function ProjectRequiredRoute() {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const {
    isLoading,
    isReady,
    error,
    hasNoProjectAccess,
    projects,
    selectedProjectId,
    selectedProject,
    selectionIssue,
    setSelectedProjectId,
    refetch,
  } = useProject();

  const routeId = routeProjectId?.trim() || '';
  const routeIdValid = isMongoObjectId(routeId);
  const routeProject = routeIdValid
    ? projects.find((project) => project.id === routeId) ?? null
    : null;

  // Deep-link: URL project wins over header "All projects" / other selection.
  useEffect(() => {
    if (!isReady || isLoading || hasNoProjectAccess || error) return;
    if (!routeProject) return;
    if (selectedProjectId === routeProject.id) return;
    setSelectedProjectId(routeProject.id);
  }, [
    isReady,
    isLoading,
    hasNoProjectAccess,
    error,
    routeProject,
    selectedProjectId,
    setSelectedProjectId,
  ]);

  if (!isReady || isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={() => void refetch()} />;
  }

  if (hasNoProjectAccess) {
    return <NoProjectAccessPage />;
  }

  if (routeId && routeIdValid && !routeProject) {
    return (
      <PermissionDenied
        title="Project not authorised"
        message="You do not have access to this project. Choose an assigned project in the header."
        showHomeLink
      />
    );
  }

  // Waiting for auto-select from URL to land in context.
  if (routeProject && selectedProjectId !== routeProject.id) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!selectedProjectId || !selectedProject) {
    const description =
      selectionIssue === 'invalid_status'
        ? 'The previously selected project is Closed or Cancelled. Choose another project in the header.'
        : selectionIssue === 'stale' || selectionIssue === 'unassigned'
          ? 'Your previous project selection is no longer assigned. Choose a project in the header.'
          : 'Select a project in the header to continue.';

    return (
      <Stack spacing={2}>
        <EmptyState title="Project required" description={description} />
        <Typography variant="body2" color="text.secondary">
          Project-scoped data is not loaded until a valid project is active.
        </Typography>
      </Stack>
    );
  }

  return <Outlet />;
}

/** Inline guard for screens that cannot use the route wrapper. */
export function ProjectRequiredGate({
  children,
}: {
  children: ReactNode;
}) {
  const {
    isLoading,
    isReady,
    error,
    hasNoProjectAccess,
    selectedProjectId,
    refetch,
  } = useProject();

  if (!isReady || isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={() => void refetch()} />;
  }

  if (hasNoProjectAccess) {
    return (
      <PermissionDenied
        title="No project access"
        message="You are not assigned to any project. Ask an administrator to grant project access."
        showHomeLink
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to continue."
      />
    );
  }

  return <>{children}</>;
}
