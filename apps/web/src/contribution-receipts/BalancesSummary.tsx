import { Chip, Stack, Typography } from '@mui/material';
import { formatInr } from '@/format';
import type { ContributionBalances } from './types';

type Props = {
  balances: ContributionBalances | undefined;
  loading?: boolean;
};

export function BalancesSummary({ balances, loading }: Props) {
  if (loading && !balances) {
    return (
      <Typography color="text.secondary">Loading balances…</Typography>
    );
  }
  if (!balances) return null;

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="contribution-balances-summary"
    >
      <Chip
        label={`Project received ${formatInr(balances.project.receivedAmount)}`}
        color="success"
        variant="outlined"
      />
      <Chip
        label={`${balances.project.postedReceiptCount} posted`}
        variant="outlined"
      />
      {balances.participant ? (
        <Chip
          label={`Participant received ${formatInr(balances.participant.receivedAmount)}`}
          variant="outlined"
        />
      ) : null}
    </Stack>
  );
}
