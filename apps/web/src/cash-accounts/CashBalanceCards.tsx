import { Alert, Box, Stack, Typography } from '@mui/material';
import { formatInr } from '@/format';
import type { CashBalanceView, PublicCashAccount } from './types';
import { CashAccountStatus } from './types';

type Props = {
  accounts: readonly PublicCashAccount[];
  balances: readonly CashBalanceView[] | undefined;
  loading?: boolean;
};

/**
 * Site accountability strip — totals from per-account `GET …/balance`.
 */
export function CashBalanceCards({ accounts, balances, loading }: Props) {
  if (loading && !balances) {
    return (
      <Typography color="text.secondary" data-testid="cash-balance-cards">
        Loading cash balances…
      </Typography>
    );
  }

  const byId = new Map((balances ?? []).map((b) => [b.cashAccountId, b]));
  const open = accounts.filter((a) => a.status !== CashAccountStatus.Closed);

  let totalBalance = 0;
  let needsReplenishment = 0;
  let overLimit = 0;
  let negative = 0;
  let withBalance = 0;

  for (const acc of open) {
    const bal = byId.get(acc.id);
    if (!bal) continue;
    withBalance += 1;
    totalBalance += bal.currentBalance;
    if (bal.needsReplenishment) needsReplenishment += 1;
    if (bal.isOverLimit) overLimit += 1;
    if (bal.isNegative) negative += 1;
  }

  const pendingHandover = accounts.filter(
    (a) => a.status === CashAccountStatus.PendingHandover,
  ).length;

  const fields = [
    {
      id: 'total',
      label: 'Open cash balance',
      value: formatInr(totalBalance),
    },
    {
      id: 'accounts',
      label: 'Open accounts',
      value: String(open.length),
    },
    {
      id: 'handover',
      label: 'Pending handover',
      value: String(pendingHandover),
    },
    {
      id: 'replenish',
      label: 'Needs replenishment',
      value: String(needsReplenishment),
    },
  ];

  return (
    <Box data-testid="cash-balance-cards">
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: 'block', mb: 1, letterSpacing: 1 }}
      >
        Site cash position
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
        }}
      >
        {fields.map((field) => (
          <Box
            key={field.id}
            sx={{
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                {field.label}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {field.value}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Box>
      {withBalance === 0 && open.length > 0 ? (
        <Alert severity="info" variant="outlined" sx={{ mt: 1.5 }}>
          Balances could not be loaded for the listed accounts.
        </Alert>
      ) : null}
      {negative > 0 || overLimit > 0 ? (
        <Alert
          severity={negative > 0 ? 'error' : 'warning'}
          variant="outlined"
          sx={{ mt: 1.5 }}
        >
          {negative > 0
            ? `${negative} account(s) show a negative balance.`
            : null}
          {negative > 0 && overLimit > 0 ? ' ' : null}
          {overLimit > 0
            ? `${overLimit} account(s) are over the holding limit.`
            : null}
        </Alert>
      ) : null}
    </Box>
  );
}
