import { Alert, Link, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatDate } from '@/format';
import type { PublicSiteExpenseVoucher } from './types';

type Props = {
  voucher: PublicSiteExpenseVoucher;
};

/**
 * Link to the posted journal entry created on expense post.
 * Nest site-expense vouchers have no reverse endpoint — corrections use
 * journal reverse on `/accounting/journals/:journalId` when permitted.
 */
export function JournalLink({ voucher }: Props) {
  if (!voucher.journalEntryId) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }} data-testid="expense-journal-empty">
        <Typography variant="subtitle1">Journal</Typography>
        <Typography variant="body2" color="text.secondary">
          No journal entry yet. Posting creates Dr Expense/WIP / Cr Petty Cash.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="expense-journal-link">
      <Stack spacing={1}>
        <Typography variant="subtitle1">Journal entry</Typography>
        <Typography variant="body2">
          Posted{' '}
          {voucher.postedAt ? formatDate(voucher.postedAt) : '—'}
          {voucher.debitAccountId
            ? ` · Debit account ${voucher.debitAccountId}`
            : ''}
        </Typography>
        <Link
          component={RouterLink}
          to={`/accounting/journals/${voucher.journalEntryId}`}
          underline="hover"
        >
          Open journal {voucher.journalEntryId}
        </Link>
        <Alert severity="info" variant="outlined">
          Posted expense vouchers are immutable. There is no{' '}
          <code>expense.reverse</code> API — reverse the linked journal (requires{' '}
          <code>journal.reverse</code>) if a correction is needed.
        </Alert>
      </Stack>
    </Paper>
  );
}
