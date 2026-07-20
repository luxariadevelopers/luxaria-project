import {
  Box,
  Chip,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import {
  getDomainStatusDisplay,
  type DomainStatusKey,
} from '@/status';
import { formatDateTime } from '@/format';
import { actionChipColor, statusChipColor } from './badgeColor';

export type TimelineItemProps = {
  event: WorkflowTimelineEvent;
  /** When set, status chips use the domain catalog for labels/colours. */
  statusDomainKey?: DomainStatusKey;
  isLast?: boolean;
  onDocumentClick?: (documentId: string) => void;
};

function formatStatusLabel(
  status: string | null,
  domainKey?: DomainStatusKey,
): string {
  if (!status) {
    return '—';
  }
  if (domainKey) {
    const domain = getDomainStatusDisplay(domainKey, status, status);
    if (domain.known) {
      return domain.label;
    }
  }
  const approval = getDomainStatusDisplay('approval', status, status);
  if (approval.known) {
    return approval.label;
  }
  // Never invent catalog values — show the raw API status string
  return status;
}

/**
 * Single immutable timeline row: action, actor, timestamp, comment,
 * status transition, and linked documents.
 */
export function TimelineItem({
  event,
  statusDomainKey,
  isLast = false,
  onDocumentClick,
}: TimelineItemProps) {
  const transition = event.statusTransition;

  return (
    <Box
      data-testid="timeline-item"
      data-event-id={event.id}
      sx={{ display: 'flex', gap: 2, position: 'relative' }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 20,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            mt: 0.75,
            flexShrink: 0,
          }}
        />
        {!isLast ? (
          <Box
            sx={{
              width: 2,
              flex: 1,
              bgcolor: 'divider',
              my: 0.5,
              minHeight: 24,
            }}
          />
        ) : null}
      </Box>

      <Stack spacing={0.75} sx={{ pb: isLast ? 0 : 2.5, minWidth: 0, flex: 1 }}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap', alignItems: 'center' }}
        >
          <Chip
            size="small"
            label={event.actionLabel}
            color={actionChipColor(event.action)}
            variant="outlined"
          />
          {event.stepNumber !== null ? (
            <Typography variant="caption" color="text.secondary">
              Step {event.stepNumber}
            </Typography>
          ) : null}
          {event.kind === 'legacy' || event.kind === 'unknown' ? (
            <Chip size="small" label="Legacy" variant="outlined" />
          ) : null}
        </Stack>

        <Typography variant="body2">
          <Box component="span" sx={{ fontWeight: 600 }}>
            {event.actor.displayName}
          </Box>
          <Box component="span" color="text.secondary">
            {' · '}
            {event.at ? formatDateTime(event.at) : 'Time unknown'}
          </Box>
        </Typography>

        {transition ? (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ alignItems: 'center' }}
          >
            <Typography variant="caption" color="text.secondary">
              Status
            </Typography>
            <Chip
              size="small"
              label={formatStatusLabel(transition.from, statusDomainKey)}
              color={statusChipColor(transition.from, statusDomainKey)}
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary">
              →
            </Typography>
            <Chip
              size="small"
              label={formatStatusLabel(transition.to, statusDomainKey)}
              color={statusChipColor(transition.to, statusDomainKey)}
              variant="filled"
            />
          </Stack>
        ) : null}

        {event.comment ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              whiteSpace: 'pre-wrap',
              borderLeft: 2,
              borderColor: 'divider',
              pl: 1.5,
            }}
          >
            {event.comment}
          </Typography>
        ) : null}

        {event.documents.length > 0 ? (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
          >
            <Typography variant="caption" color="text.secondary">
              Documents
            </Typography>
            {event.documents.map((doc) =>
              onDocumentClick ? (
                <Link
                  key={doc.id}
                  component="button"
                  type="button"
                  variant="caption"
                  onClick={() => onDocumentClick(doc.id)}
                >
                  {doc.label ?? doc.id}
                </Link>
              ) : (
                <Typography key={doc.id} variant="caption">
                  {doc.label ?? doc.id}
                </Typography>
              ),
            )}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
