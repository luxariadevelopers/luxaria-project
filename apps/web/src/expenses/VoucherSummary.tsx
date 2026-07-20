import { Alert, Stack, Typography } from '@mui/material';
import {
  SummaryCards,
  type EntitySummaryField,
} from '@/components/entity-detail';
import { formatDate, formatInr } from '@/format';
import { paymentModeLabel } from './labels';
import type { PublicSiteExpenseVoucher } from './types';

type Props = {
  voucher: PublicSiteExpenseVoucher;
  projectLabel: string;
  fields?: EntitySummaryField[];
};

/**
 * Read-only voucher summary — evidence and amounts are not editable here
 * (posted vouchers are immutable; Nest rejects updates after post).
 */
export function VoucherSummary({ voucher, projectLabel, fields }: Props) {
  const summaryFields: EntitySummaryField[] =
    fields ??
    [
      {
        id: 'date',
        label: 'Expense date',
        value: formatDate(voucher.expenseDate),
      },
      {
        id: 'amount',
        label: 'Amount',
        value: formatInr(voucher.amount),
      },
      {
        id: 'paidTo',
        label: 'Paid to',
        value: voucher.paidTo,
      },
      {
        id: 'mode',
        label: 'Payment mode',
        value: paymentModeLabel(voucher.paymentMode),
      },
      {
        id: 'bill',
        label: 'Bill',
        value: voucher.billNumber?.trim()
          ? `${voucher.billNumber}${
              voucher.billDate ? ` · ${formatDate(voucher.billDate)}` : ''
            }`
          : '—',
      },
      {
        id: 'project',
        label: 'Project',
        value: projectLabel,
      },
    ];

  return (
    <Stack spacing={2} data-testid="expense-voucher-summary">
      <SummaryCards fields={summaryFields} />
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">Purpose</Typography>
        <Typography variant="body2">{voucher.purpose}</Typography>
        {voucher.mobileNumber ? (
          <Typography variant="body2" color="text.secondary">
            Mobile: {voucher.mobileNumber}
          </Typography>
        ) : null}
        {voucher.deviceId ? (
          <Typography variant="body2" color="text.secondary">
            Device: {voucher.deviceId}
          </Typography>
        ) : null}
      </Stack>
      {voucher.warnings.length > 0 ? (
        <Alert severity="warning" variant="outlined">
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Soft warnings (do not block workflow)
          </Typography>
          <Stack component="ul" sx={{ m: 0, pl: 2 }}>
            {voucher.warnings.map((w) => (
              <li key={w}>
                <Typography variant="body2">{w}</Typography>
              </li>
            ))}
          </Stack>
        </Alert>
      ) : null}
      {voucher.rejectionReason &&
      (voucher.status === 'rejected' || voucher.status === 'returned') ? (
        <Alert severity="error" variant="outlined">
          {voucher.status === 'rejected' ? 'Rejection' : 'Return'} reason:{' '}
          {voucher.rejectionReason}
        </Alert>
      ) : null}
      {voucher.cancellationReason ? (
        <Alert severity="info" variant="outlined">
          Cancellation reason: {voucher.cancellationReason}
        </Alert>
      ) : null}
    </Stack>
  );
}
