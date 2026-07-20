import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { formatOptionalMoney } from './formatMoney';
import type { CostTrendPoint } from './deriveCostForecast';

type Props = {
  points: readonly CostTrendPoint[];
  loading?: boolean;
};

/**
 * Budget / actual / commitment / forecast comparison (CSS bars — no chart lib).
 */
export function CostTrendChart({ points, loading = false }: Props) {
  const max = Math.max(...points.map((p) => p.amount), 1);

  return (
    <Box
      data-testid="cost-trend-chart"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
        Cost forecast trend
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Budget, actual, commitments, forecast-to-complete and projected final
        — all amounts from the project dashboard API.
      </Typography>

      {loading ? (
        <Typography color="text.secondary">Loading trend…</Typography>
      ) : points.length === 0 ? (
        <Typography color="text.secondary">No dashboard metrics yet.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {points.map((point) => {
            const pct = Math.min(100, (point.amount / max) * 100);
            return (
              <Box key={point.key}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'space-between', mb: 0.5 }}
                >
                  <Typography variant="body2">{point.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatOptionalMoney(point.amount)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
