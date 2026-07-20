import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDate, formatInr } from '@/format';
import type { CustomerReceiptRow } from './types';

type Props = {
  receipts: readonly CustomerReceiptRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
};

export function CustomerReceiptsPanel({
  receipts,
  loading,
  error,
  onRetry,
  canView,
}: Props) {
  if (!canView) {
    return (
      <PermissionDenied
        title="Receipts unavailable"
        message="You need collection.view to list this customer’s receipts."
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
        Loading receipts…
      </Typography>
    );
  }

  if (receipts.length === 0) {
    return (
      <EmptyState
        title="No receipts"
        description="Customer receipts will appear here when collected."
      />
    );
  }

  return (
    <Stack spacing={1} data-testid="customer-receipts-panel">
      <Typography variant="body2" color="text.secondary">
        From <code>GET /customer-receipts?customerId=</code> (
        <code>collection.view</code>).
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Number</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Mode</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Allocated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {receipts.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.receiptNumber}</TableCell>
              <TableCell>
                {row.receiptDate ? formatDate(row.receiptDate) : '—'}
              </TableCell>
              <TableCell>{row.paymentMode}</TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell align="right">{formatInr(row.amount)}</TableCell>
              <TableCell align="right">
                {formatInr(row.allocatedAmount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
