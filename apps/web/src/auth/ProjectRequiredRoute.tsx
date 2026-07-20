import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { NoProjectAccessPage } from '@/pages/NoProjectAccessPage';

/**
 * Route wrapper for project-scoped screens.
 * Ensures a valid active project (access + workflow status) before rendering.
 * Hiding UI is not enough — this is the route guard; API 403s still surface via RetryPanel.
 */
export function ProjectRequiredRoute() {
  const {
    isLoading,
    isReady,
    error,
    hasNoProjectAccess,
    selectedProjectId,
    selectedProject,
    selectionIssue,
    refetch,
  } = useProject();

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

  if (!selectedProjectId || !selectedProject) {
    const description =
      selectionIssue === 'invalid_status'
        ? 'The previously selected project is Closed or Cancelled. Choose another project in the header.'
        : selectionIssue === 'stale' || selectionIssue === 'unassigned'
          ? 'Your previous project selection is no longer assigned. Choose a project in the header.'
          : 'Select a project in the header to continue.';

    return (
      <Stack spacing={2}>
        <EmptyState
          title="Project required"
          description={description}
        />
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
