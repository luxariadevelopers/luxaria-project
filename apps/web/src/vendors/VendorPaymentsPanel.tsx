import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDate, formatInr } from '@/format';
import { vendorPaymentStatusLabel } from './labels';
import type { PublicVendorPaymentRow } from './types';

type Props = {
  payments: readonly PublicVendorPaymentRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
};

export function VendorPaymentsPanel({
  payments,
  loading,
  error,
  onRetry,
  canView,
}: Props) {
  if (!canView) {
    return (
      <PermissionDenied
        title="Payments unavailable"
        message="You need payment.view to list vendor payments."
        showHomeLink={false}
      />
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading payments…
      </Typography>
    );
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        title="No payments"
        description="Vendor payments for this supplier will appear here."
      />
    );
  }

  return (
    <Table size="small" data-testid="vendor-payments-panel">
      <TableHead>
        <TableRow>
          <TableCell>Payment #</TableCell>
          <TableCell>Date</TableCell>
          <TableCell align="right">Amount</TableCell>
          <TableCell align="right">Bank amount</TableCell>
          <TableCell>Mode</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>UTR / ref</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {payments.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.paymentNumber}</TableCell>
            <TableCell>{formatDate(row.paymentDate)}</TableCell>
            <TableCell align="right">{formatInr(row.amount)}</TableCell>
            <TableCell align="right">{formatInr(row.bankAmount)}</TableCell>
            <TableCell>{row.paymentMode}</TableCell>
            <TableCell>{vendorPaymentStatusLabel(row.status)}</TableCell>
            <TableCell>{row.transactionReference}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
