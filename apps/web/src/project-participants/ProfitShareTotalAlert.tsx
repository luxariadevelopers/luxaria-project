import { Alert, Chip, Stack, Typography } from '@mui/material';
import { formatProfitSharePercent } from './labels';
import {
  assessProfitShareTotal,
  type ProfitShareTotalAssessment,
} from './profitShareTotal';

type Props = {
  totalProfitSharePercentage: number;
  /** Prefer Nest `isBalanced` when present. */
  isBalanced?: boolean;
  note?: string;
  isFinalised?: boolean;
};

/**
 * Active approved project profit-share total vs 100% rule.
 */
export function ProfitShareTotalAlert({
  totalProfitSharePercentage,
  isBalanced,
  note,
  isFinalised,
}: Props) {
  const assessed: ProfitShareTotalAssessment = assessProfitShareTotal(
    totalProfitSharePercentage,
  );
  const balanced =
    isBalanced != null ? isBalanced : assessed.isBalanced;

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
      data-testid="profit-share-total-alert"
      sx={{ alignItems: 'flex-start' }}
    >
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Typography variant="subtitle2">
            Active profit share:{' '}
            {formatProfitSharePercent(totalProfitSharePercentage)}
          </Typography>
          <Chip
            size="small"
            color={balanced ? 'success' : 'warning'}
            label={balanced ? '100% balanced' : 'Not 100%'}
          />
          {isFinalised != null ? (
            <Chip
              size="small"
              color={isFinalised ? 'primary' : 'default'}
              variant="outlined"
              label={isFinalised ? 'Configuration finalised' : 'Not finalised'}
            />
          ) : null}
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
