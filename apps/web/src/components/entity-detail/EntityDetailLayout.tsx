import { Box, CircularProgress, Stack } from '@mui/material';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import type { EntityDetailLayoutProps } from './types';

/**
 * Shared information architecture for business-record detail screens.
 *
 * Order: header → status strip → action bar → summary → tabs → timeline → children.
 * Callers must still use route guards (`RegistryRouteGuard` / `ProjectRequiredRoute`)
 * and gate API queries; this layout surfaces loading / empty / 403 / retry states.
 */
export function EntityDetailLayout({
  canView,
  projectReady = true,
  loading = false,
  error,
  onRetry,
  notFound = false,
  permissionTitle = 'Record unavailable',
  permissionMessage = 'You need view permission for this record.',
  projectMissingTitle = 'Project required',
  projectMissingDescription = 'Select a valid project before opening this record.',
  notFoundTitle = 'Record not found',
  notFoundDescription = 'This record may have been removed or belongs to another project.',
  header,
  statusStrip,
  summary,
  actionBar,
  tabs,
  timeline,
  children,
}: EntityDetailLayoutProps) {
  if (!canView) {
    return (
      <PermissionDenied
        title={permissionTitle}
        message={permissionMessage}
      />
    );
  }

  if (!projectReady) {
    return (
      <EmptyState
        title={projectMissingTitle}
        description={projectMissingDescription}
      />
    );
  }

  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 6 }}
        data-testid="entity-detail-loading"
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <RetryPanel error={error} onRetry={onRetry} forceRetry />
    );
  }

  if (notFound) {
    return (
      <EmptyState
        title={notFoundTitle}
        description={notFoundDescription}
      />
    );
  }

  return (
    <Stack spacing={2.5} data-testid="entity-detail-layout">
      {header}
      {statusStrip}
      {actionBar}
      {summary}
      {tabs}
      {timeline}
      {children}
    </Stack>
  );
}
