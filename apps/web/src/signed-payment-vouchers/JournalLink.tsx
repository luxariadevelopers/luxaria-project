import { Alert, Link, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatDate } from '@/format';
import type { PublicSignedPaymentVoucher } from './types';
import { SIGNED_PAYMENT_VOUCHER_ROUTES } from './routes';

type Props = {
  voucher: PublicSignedPaymentVoucher;
};

export function JournalLink({ voucher }: Props) {
  if (!voucher.journalEntryId) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }} data-testid="signed-voucher-journal-empty">
        <Typography variant="subtitle1">Journal</Typography>
        <Typography variant="body2" color="text.secondary">
          No journal entry yet. Posting creates Dr Expense / Cr Petty Cash.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="signed-voucher-journal-link">
      <Stack spacing={1}>
        <Typography variant="subtitle1">Journal entry</Typography>
        <Typography variant="body2">
          Posted {voucher.postedAt ? formatDate(voucher.postedAt) : '—'}
        </Typography>
        <Link
          component={RouterLink}
          to={`/accounting/journals/${voucher.journalEntryId}`}
          underline="hover"
        >
          Open journal {voucher.journalEntryId}
        </Link>
        {voucher.reversalJournalEntryId ? (
          <Link
            component={RouterLink}
            to={`/accounting/journals/${voucher.reversalJournalEntryId}`}
            underline="hover"
          >
            Reversal journal {voucher.reversalJournalEntryId}
          </Link>
        ) : null}
        {voucher.replacementVoucherId ? (
          <Link
            component={RouterLink}
            to={SIGNED_PAYMENT_VOUCHER_ROUTES.detail(voucher.replacementVoucherId)}
            underline="hover"
          >
            Replacement voucher
          </Link>
        ) : null}
        <Alert severity="info" variant="outlined">
          Posted vouchers are immutable. Use reverse on this voucher to create a
          reversal journal (requires <code>payment.approve</code>).
        </Alert>
      </Stack>
    </Paper>
  );
}
