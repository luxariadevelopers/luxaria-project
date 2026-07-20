import { Box, Skeleton, Typography } from '@mui/material';
import { DrillDownNav } from './DrillDownNav';
import {
  formatOptionalCount,
  formatOptionalMoney,
  hasMetric,
} from './formatMetric';
import type { DrillDownLink } from './types';

type Props = {
  title: string;
  /** Omit or pass null when the metric is unavailable — never invent a zero. */
  amount?: number | null;
  count?: number | null;
  countLabel?: string;
  loading?: boolean;
  drillDown?: readonly DrillDownLink[];
  emphasize?: boolean;
};

export function KpiCard({
  title,
  amount,
  count,
  countLabel = 'items',
  loading = false,
  drillDown = [],
  emphasize = false,
}: Props) {
  return (
    <Box
      data-testid="director-kpi-card"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: emphasize ? 'warning.light' : 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      {loading ? (
        <Skeleton width="60%" height={36} sx={{ mt: 0.5 }} />
      ) : (
        <Typography
          variant="h5"
          sx={{ mt: 0.5, fontWeight: 700, letterSpacing: -0.5 }}
        >
          {hasMetric(amount) ? formatOptionalMoney(amount) : '—'}
        </Typography>
      )}
      {!loading && hasMetric(count) ? (
        <Typography variant="body2" color="text.secondary">
          {formatOptionalCount(count)} {countLabel}
        </Typography>
      ) : null}
      {!loading ? <DrillDownNav links={drillDown} /> : null}
    </Box>
  );
}
