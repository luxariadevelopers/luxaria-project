import { Alert, Chip, Stack, Typography } from '@mui/material';
import { formatShareholdingPercent } from '@/directors/shareholdingDisplay';
import {
  assessTotalPercentage,
  type TotalPercentageAssessment,
} from './totalPercentage';

type Props = {
  totalPercentage: number;
  /** Prefer Nest `isBalanced` when present; recompute when absent. */
  isBalanced?: boolean;
  note?: string;
};

/**
 * Shows active ownership total vs the Nest 100% rule.
 */
export function TotalPercentageIndicator({
  totalPercentage,
  isBalanced,
  note,
}: Props) {
  const assessed: TotalPercentageAssessment =
    assessTotalPercentage(totalPercentage);
  const balanced =
    isBalanced != null
      ? isBalanced
      : assessed.status === 'balanced';

  const severity =
    assessed.status === 'balanced' || balanced
      ? 'success'
      : assessed.status === 'empty'
        ? 'info'
        : 'warning';

  return (
    <Alert
      severity={severity}
      variant="outlined"
      data-testid="shareholding-total-indicator"
      sx={{ alignItems: 'flex-start' }}
    >
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Typography variant="subtitle2">
            Active total: {formatShareholdingPercent(totalPercentage)}
          </Typography>
          <Chip
            size="small"
            color={balanced ? 'success' : 'warning'}
            label={balanced ? '100% valid' : 'Must equal 100%'}
          />
        </Stack>
        <Typography variant="body2">{assessed.message}</Typography>
        {note ? (
          <Typography variant="caption" color="text.secondary">
            {note}
          </Typography>
        ) : null}
      </Stack>
    </Alert>
  );
}
