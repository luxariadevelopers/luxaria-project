import { Chip } from '@mui/material';
import { invoiceStatusLabel } from './labels';
import { VendorInvoiceStatus } from './types';

type Props = {
  status: string;
};

export function InvoiceStatusChip({ status }: Props) {
  const color =
    status === VendorInvoiceStatus.Posted ||
    status === VendorInvoiceStatus.Paid
      ? 'success'
      : status === VendorInvoiceStatus.Approval ||
          status === VendorInvoiceStatus.Matching
        ? 'warning'
        : status === VendorInvoiceStatus.Submitted ||
            status === VendorInvoiceStatus.Verification
          ? 'info'
          : status === VendorInvoiceStatus.Cancelled
            ? 'default'
            : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === VendorInvoiceStatus.Paid ||
        status === VendorInvoiceStatus.Posted
          ? 'filled'
          : 'outlined'
      }
      label={invoiceStatusLabel(status)}
      data-testid="vendor-invoice-status-chip"
      data-status={status}
    />
  );
}
