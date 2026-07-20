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
import { vendorInvoiceStatusLabel } from './labels';
import type { PublicVendorInvoiceRow } from './types';

type Props = {
  invoices: readonly PublicVendorInvoiceRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
};

export function VendorInvoicesPanel({
  invoices,
  loading,
  error,
  onRetry,
  canView,
}: Props) {
  if (!canView) {
    return (
      <PermissionDenied
        title="Invoices unavailable"
        message="You need vendor_invoice.view to list vendor invoices."
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
        Loading invoices…
      </Typography>
    );
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No invoices"
        description="Vendor invoices for this supplier will appear here."
      />
    );
  }

  return (
    <Table size="small" data-testid="vendor-invoices-panel">
      <TableHead>
        <TableRow>
          <TableCell>Document</TableCell>
          <TableCell>Invoice #</TableCell>
          <TableCell>Date</TableCell>
          <TableCell align="right">Total</TableCell>
          <TableCell align="right">Remaining</TableCell>
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {invoices.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.documentNumber}</TableCell>
            <TableCell>{row.invoiceNumber}</TableCell>
            <TableCell>{formatDate(row.invoiceDate)}</TableCell>
            <TableCell align="right">{formatInr(row.totalAmount)}</TableCell>
            <TableCell align="right">
              {formatInr(row.remainingPayable)}
            </TableCell>
            <TableCell>{vendorInvoiceStatusLabel(row.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
