import { Alert, Chip, Stack, Typography } from '@mui/material';
import { formatInr } from '@/format';
import type { ApprovedRequestBalance } from './types';

type Props = {
  balance: ApprovedRequestBalance | undefined;
  loading?: boolean;
  error?: unknown;
};

/**
 * Remaining approved request balance available for fund transfers.
 * Sourced from `GET …/request/:requestId/balance`.
 */
export function ApprovedBalanceDisplay({ balance, loading, error }: Props) {
  if (loading && !balance) {
    return (
      <Typography color="text.secondary" data-testid="approved-balance-loading">
        Loading approved balance…
      </Typography>
    );
  }

  if (error && !balance) {
    return (
      <Alert severity="warning" data-testid="approved-balance-error">
        Could not load approved remainder for this request.
      </Alert>
    );
  }

  if (!balance) {
    return (
      <Typography color="text.secondary" variant="body2">
        Select an approved request to see remaining funding headroom.
      </Typography>
    );
  }

  return (
    <Stack
      spacing={1}
      data-testid="approved-balance-display"
      sx={{
        p: 1.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="subtitle2">Approved funding balance</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Chip
          label={`Remaining ${formatInr(balance.remainingApprovedBalance)}`}
          color={
            balance.remainingApprovedBalance > 0 ? 'success' : 'default'
          }
          variant="outlined"
        />
        <Chip
          label={`Approved ${formatInr(balance.approvedAmount)}`}
          variant="outlined"
        />
        <Chip
          label={`Funded ${formatInr(balance.fundedAmount)}`}
          variant="outlined"
        />
        <Chip
          label={`Committed transfers ${formatInr(balance.committedTransferAmount)}`}
          variant="outlined"
        />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Amount cannot exceed remaining approved balance. Nest is authoritative.
      </Typography>
    </Stack>
  );
}
