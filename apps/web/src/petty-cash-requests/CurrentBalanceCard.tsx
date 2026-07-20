import { Alert, Stack, Typography } from '@mui/material';
import { formatDate, formatInr } from '@/format';
import type { CashBalanceView, PublicPettyCashRequirement } from './types';

type Props = {
  /** Snapshot fields from the requirement (always shown on detail). */
  request?: Pick<
    PublicPettyCashRequirement,
    | 'currentCashBalance'
    | 'previousUnsettledAmount'
    | 'warnings'
    | 'requestedAmount'
    | 'approvedAmount'
    | 'fundedAmount'
  > | null;
  /** Optional live balance from `GET /cash-accounts/:id/balance`. */
  liveBalance?: CashBalanceView | null;
  liveLoading?: boolean;
  liveErrorMessage?: string | null;
};

/**
 * Current float context: snapshot balance, unsettled prior weeks, warnings.
 */
export function CurrentBalanceCard({
  request,
  liveBalance,
  liveLoading = false,
  liveErrorMessage = null,
}: Props) {
  return (
    <Stack
      spacing={1.25}
      data-testid="current-balance-card"
      sx={{
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="subtitle1">Cash balance context</Typography>

      {request ? (
        <Stack spacing={0.5}>
          <Typography variant="body2">
            Snapshot balance:{' '}
            <strong>{formatInr(request.currentCashBalance)}</strong>
          </Typography>
          <Typography variant="body2">
            Previous unsettled:{' '}
            <strong>{formatInr(request.previousUnsettledAmount)}</strong>
          </Typography>
          <Typography variant="body2">
            Requested: <strong>{formatInr(request.requestedAmount)}</strong>
            {request.approvedAmount != null
              ? ` · Approved: ${formatInr(request.approvedAmount)}`
              : ''}
            {request.fundedAmount != null
              ? ` · Funded: ${formatInr(request.fundedAmount)}`
              : ''}
          </Typography>
        </Stack>
      ) : null}

      {liveLoading ? (
        <Typography variant="caption" color="text.secondary">
          Loading live balance…
        </Typography>
      ) : null}

      {liveErrorMessage ? (
        <Alert severity="warning" variant="outlined">
          {liveErrorMessage}
        </Alert>
      ) : null}

      {liveBalance ? (
        <Stack spacing={0.5}>
          <Typography variant="body2">
            Live balance ({liveBalance.accountCode}):{' '}
            <strong>{formatInr(liveBalance.currentBalance)}</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            As of {formatDate(liveBalance.asOf)}
            {liveBalance.needsReplenishment ? ' · Needs replenishment' : ''}
            {liveBalance.isOverLimit ? ' · Over holding limit' : ''}
            {liveBalance.isNegative ? ' · Negative' : ''}
          </Typography>
        </Stack>
      ) : null}

      {request?.warnings?.length ? (
        <Stack spacing={0.75}>
          {request.warnings.map((warning) => (
            <Alert key={warning} severity="warning" variant="outlined">
              {warning}
            </Alert>
          ))}
        </Stack>
      ) : null}

      {!request && !liveBalance && !liveLoading && !liveErrorMessage ? (
        <Typography variant="body2" color="text.secondary">
          Select a petty-cash account to preview the current float.
        </Typography>
      ) : null}
    </Stack>
  );
}
