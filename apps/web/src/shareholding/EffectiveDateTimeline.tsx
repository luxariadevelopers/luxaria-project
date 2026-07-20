import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { formatDate } from '@/format';
import { formatShareholdingPercent } from '@/directors/shareholdingDisplay';
import type { PublicShareholding } from '@/directors/types';
import type { ShareholdingIntervalOverlap } from './effectiveDateOverlap';

type Props = {
  holdings: readonly PublicShareholding[];
  overlaps?: readonly ShareholdingIntervalOverlap[];
};

/**
 * Effective-date timeline for versioned holdings (active + closed).
 * Does not edit history — display only.
 */
export function EffectiveDateTimeline({
  holdings,
  overlaps = [],
}: Props) {
  const sorted = [...holdings].sort((a, b) => {
    if (a.version !== b.version) return b.version - a.version;
    return Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom);
  });

  if (sorted.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No shareholding history to timeline.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5} data-testid="shareholding-effective-timeline">
      <Typography variant="subtitle2">Effective-date timeline</Typography>
      {overlaps.length > 0 ? (
        <Typography variant="body2" color="error">
          {overlaps.length} overlapping interval
          {overlaps.length === 1 ? '' : 's'} detected — history should close
          prior rows before opening a new version.
        </Typography>
      ) : null}
      <Stack spacing={1}>
        {sorted.map((row) => {
          const active = row.effectiveTo == null;
          const overlapped = overlaps.some(
            (o) => o.a.id === row.id || o.b.id === row.id,
          );
          return (
            <Box
              key={row.id}
              sx={{
                display: 'grid',
                gap: 0.5,
                gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
                p: 1.25,
                border: '1px solid',
                borderColor: overlapped
                  ? 'error.light'
                  : active
                    ? 'success.light'
                    : 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  color={active ? 'success' : 'default'}
                  label={active ? 'Active' : 'Historical'}
                />
                <Chip size="small" variant="outlined" label={`v${row.version}`} />
                {overlapped ? (
                  <Chip size="small" color="error" label="Overlap" />
                ) : null}
              </Stack>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatShareholdingPercent(row.percentage)} · director …
                  {row.directorId.slice(-8)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(row.effectiveFrom)}
                  {' → '}
                  {row.effectiveTo ? formatDate(row.effectiveTo) : 'present'}
                  {row.approvalReference
                    ? ` · ${row.approvalReference}`
                    : ''}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}
