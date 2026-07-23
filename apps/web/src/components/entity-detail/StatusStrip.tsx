import { Chip, Stack, Typography } from '@mui/material';
import { getDomainStatusDisplay } from '@/status';
import { statusChipColor } from '@/workflow-timeline/badgeColor';
import type { StatusStripProps } from './types';

/**
 * Compact status band for detail screens (catalog-backed label + chip colour).
 */
export function StatusStrip({
  status,
  domainKey,
  badges = [],
  meta,
}: StatusStripProps) {
  const display = getDomainStatusDisplay(domainKey, status, status);

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      data-testid="entity-status-strip"
      sx={{
        alignItems: 'center',
        flexWrap: 'wrap',
        rowGap: 0.75,
        py: 1,
        px: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        borderRadius: 1,
        minWidth: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
        Status
      </Typography>
      <Chip
        size="small"
        label={display.label}
        color={statusChipColor(status, domainKey)}
        variant={display.known ? 'filled' : 'outlined'}
      />
      {badges.map((badge) => (
        <Chip
          key={badge.id}
          size="small"
          label={badge.label}
          color={badge.color ?? 'default'}
          variant="outlined"
        />
      ))}
      {meta ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            ml: { xs: 0, sm: 'auto' },
            width: { xs: '100%', sm: 'auto' },
            wordBreak: 'break-word',
          }}
        >
          {meta}
        </Typography>
      ) : null}
    </Stack>
  );
}
