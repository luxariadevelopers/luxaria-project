import { CircularProgress, Paper, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import type { DomainStatusKey } from '@/status';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { TimelineItem } from './TimelineItem';

export type WorkflowTimelineProps = {
  events: readonly WorkflowTimelineEvent[];
  /**
   * Entity (or approval) view permission already evaluated by the caller.
   * When false, history is not shown — hiding alone is not enough; pair with
   * route guards and handle API 403 via `error`.
   */
  canView: boolean;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  statusDomainKey?: DomainStatusKey;
  onDocumentClick?: (documentId: string) => void;
  permissionTitle?: string;
  permissionMessage?: string;
};

/**
 * Reusable immutable workflow / approval audit timeline.
 * Renders loading, empty, error, permission-denied, and mixed event types.
 */
export function WorkflowTimeline({
  events,
  canView,
  loading = false,
  error,
  onRetry,
  title = 'History',
  emptyTitle = 'No history yet',
  emptyDescription = 'Status and approval events will appear here as the workflow progresses.',
  statusDomainKey,
  onDocumentClick,
  permissionTitle = 'History unavailable',
  permissionMessage = 'You need view permission for this record to see its audit timeline.',
}: WorkflowTimelineProps) {
  if (!canView) {
    return (
      <PermissionDenied
        title={permissionTitle}
        message={permissionMessage}
        showHomeLink={false}
      />
    );
  }

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }} data-testid="workflow-timeline-loading">
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h6" sx={{ alignSelf: 'flex-start' }}>
            {title}
          </Typography>
          <CircularProgress size={28} />
          <Typography color="text.secondary" variant="body2">
            Loading timeline…
          </Typography>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">{title}</Typography>
          <RetryPanel error={error} onRetry={onRetry} forceRetry />
        </Stack>
      </Paper>
    );
  }

  if (events.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">{title}</Typography>
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{ p: 3 }}
      data-testid="workflow-timeline"
    >
      <Stack spacing={2}>
        <Typography variant="h6">{title}</Typography>
        <BoxList>
          {events.map((event, index) => (
            <TimelineItem
              key={event.id}
              event={event}
              statusDomainKey={statusDomainKey}
              isLast={index === events.length - 1}
              onDocumentClick={onDocumentClick}
            />
          ))}
        </BoxList>
      </Stack>
    </Paper>
  );
}

function BoxList({ children }: { children: ReactNode }) {
  return <Stack spacing={0}>{children}</Stack>;
}
