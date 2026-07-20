import { Chip, Stack, Typography } from '@mui/material';
import { formatInr } from '@/format';
import { isJournalBalanced, sumJournalTotals } from './balance';
import type { PublicJournalEntry } from './types';

type Props = {
  rows: readonly PublicJournalEntry[];
};

/** Debit / credit totals for the current result page + balance indicator. */
export function JournalTotalsBar({ rows }: Props) {
  const totals = sumJournalTotals(rows);

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      useFlexGap
      sx={{
        flexWrap: 'wrap',
        alignItems: { sm: 'center' },
        px: 1,
        py: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
      data-testid="journal-totals-bar"
    >
      <Typography variant="body2" color="text.secondary">
        Page totals
      </Typography>
      <Typography variant="body2">
        Debit <strong>{formatInr(totals.totalDebit)}</strong>
      </Typography>
      <Typography variant="body2">
        Credit <strong>{formatInr(totals.totalCredit)}</strong>
      </Typography>
      <Chip
        size="small"
        color={totals.balanced ? 'success' : 'error'}
        label={totals.balanced ? 'Balanced' : 'Out of balance'}
        data-testid="journal-page-balance-chip"
      />
      {rows.some(
        (r) => !isJournalBalanced(r.totalDebit, r.totalCredit),
      ) ? (
        <Typography variant="caption" color="error">
          One or more rows report unequal debit/credit (unexpected from Nest).
        </Typography>
      ) : null}
    </Stack>
  );
}
