import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { formatInr } from '@/format';
import type { ParticipantFundingRow } from './types';

type Props = {
  rows: readonly ParticipantFundingRow[];
  loading?: boolean;
};

/**
 * Horizontal bar chart of committed amounts by participant (CSS bars — no chart lib).
 */
export function ParticipantFundingChart({ rows, loading = false }: Props) {
  const max = Math.max(...rows.map((r) => r.committedAmount), 1);

  return (
    <Box
      data-testid="participant-funding-chart"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
        Funding by participant
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Approved commitments — committed vs received (gap = pending).
      </Typography>

      {loading ? (
        <Typography color="text.secondary">Loading participants…</Typography>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary">
          No approved commitments for this project.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => {
            const pct = Math.min(100, (row.committedAmount / max) * 100);
            const receivedPct =
              row.committedAmount > 0
                ? Math.min(
                    100,
                    (row.receivedAmount / row.committedAmount) * 100,
                  )
                : 0;
            return (
              <Box key={row.participantId}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'space-between', mb: 0.5 }}
                >
                  <Typography variant="body2">{row.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatInr(row.committedAmount)} · received{' '}
                    {formatInr(row.receivedAmount)} · gap{' '}
                    {formatInr(row.pendingAmount)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{ height: 8, borderRadius: 1, mb: 0.5 }}
                />
                <LinearProgress
                  variant="determinate"
                  value={receivedPct}
                  color="success"
                  sx={{ height: 4, borderRadius: 1 }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
