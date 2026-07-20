import { Alert, Stack, Typography } from '@mui/material';
import { formatOptionalMoney } from '@/director-command-centre/formatMetric';
import type { CashBankBookPayload } from './types';
import { validateCashBankBookPayload } from './reconcile';

type Props = {
  payload: CashBankBookPayload;
};

export function BookSummary({ payload }: Props) {
  const check = validateCashBankBookPayload(payload);
  const totals = payload.totals;

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
      >
        <SummaryTile label="Opening" value={totals.openingBalance} />
        <SummaryTile label="Debit" value={totals.debit} />
        <SummaryTile label="Credit" value={totals.credit} />
        <SummaryTile label="Closing" value={totals.closingBalance} />
      </Stack>

      {check.totalsOk && check.runningOk ? (
        <Alert severity="success" variant="outlined">
          Reconciled: opening + movements = closing (
          {formatOptionalMoney(check.expectedClosing)}). Running balances match
          the movement trail.
        </Alert>
      ) : (
        <Alert severity="error" variant="outlined">
          Reconciliation failed
          {!check.totalsOk
            ? ` — expected closing ${formatOptionalMoney(check.expectedClosing)}, got ${formatOptionalMoney(totals.closingBalance)}`
            : ''}
          {!check.runningOk ? ' — running balance does not match movements' : ''}
          {payload.meta.reconciliationNotes.length
            ? `. ${payload.meta.reconciliationNotes.join(' ')}`
            : '.'}
        </Alert>
      )}
    </Stack>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <Stack
      spacing={0.25}
      sx={{
        minWidth: 140,
        px: 1.5,
        py: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {formatOptionalMoney(value)}
      </Typography>
    </Stack>
  );
}
