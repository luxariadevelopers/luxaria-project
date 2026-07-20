import { Alert, Chip, Stack, Typography } from '@mui/material';
import { formatInr } from '@/format';
import type { CommitmentSummary } from './types';

type Props = {
  summary: CommitmentSummary | undefined;
  loading?: boolean;
};

/**
 * Committed / received / pending totals from `GET …/commitments/summary`
 * (approved rows only on Nest).
 */
export function CommitmentAmountSummary({ summary, loading }: Props) {
  if (loading && !summary) {
    return (
      <Typography color="text.secondary">Loading funding summary…</Typography>
    );
  }

  if (!summary) return null;

  return (
    <Stack spacing={1} data-testid="commitment-amount-summary">
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Chip
          label={`Committed ${formatInr(summary.committedAmount)}`}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`Received ${formatInr(summary.receivedAmount)}`}
          color="success"
          variant="outlined"
        />
        <Chip
          label={`Pending ${formatInr(summary.pendingAmount)}`}
          color="warning"
          variant="outlined"
        />
        <Chip
          label={`${summary.approvedCommitmentCount} approved`}
          variant="outlined"
        />
      </Stack>
      {summary.note ? (
        <Alert severity="info" variant="outlined">
          {summary.note}
        </Alert>
      ) : null}
    </Stack>
  );
}
