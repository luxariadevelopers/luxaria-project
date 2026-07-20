import { Chip } from '@mui/material';
import { matchingStatusLabel } from './labels';
import { VendorInvoiceMatchingStatus } from './types';

type Props = {
  status: string;
};

export function MatchingStatusChip({ status }: Props) {
  const color =
    status === VendorInvoiceMatchingStatus.Matched ||
    status === VendorInvoiceMatchingStatus.MatchedWithTolerance
      ? 'success'
      : status === VendorInvoiceMatchingStatus.Exception ||
          status === VendorInvoiceMatchingStatus.Rejected
        ? 'error'
        : 'warning';

  return (
    <Chip
      size="small"
      color={color}
      variant="outlined"
      label={matchingStatusLabel(status)}
      data-testid="vendor-invoice-matching-chip"
      data-status={status}
    />
  );
}
