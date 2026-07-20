import { Box, LinearProgress, Typography } from '@mui/material';
import { formatOptionalPercent, hasMetric } from './formatMetric';

type Props = {
  percent: number | null | undefined;
  label?: string;
  /** When true, use warning colour (e.g. financial lagging). */
  warn?: boolean;
};

export function ProgressBarCell({ percent, label, warn = false }: Props) {
  if (!hasMetric(percent)) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }

  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <Box sx={{ minWidth: 96 }} data-testid="progress-bar-cell">
      {label ? (
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      ) : null}
      <LinearProgress
        variant="determinate"
        value={clamped}
        color={warn ? 'warning' : 'primary'}
        sx={{ height: 8, borderRadius: 0.5, mt: 0.25 }}
      />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {formatOptionalPercent(percent)}
      </Typography>
    </Box>
  );
}
