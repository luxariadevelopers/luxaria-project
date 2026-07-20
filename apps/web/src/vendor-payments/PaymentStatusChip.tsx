import { Chip } from '@mui/material';
import { paymentStatusLabel } from './labels';
import { VendorPaymentStatus } from './types';

type Props = {
  status: string;
};

export function PaymentStatusChip({ status }: Props) {
  const color =
    status === VendorPaymentStatus.Posted
      ? 'success'
      : status === VendorPaymentStatus.Released ||
          status === VendorPaymentStatus.Verified
        ? 'info'
        : status === VendorPaymentStatus.Approval
          ? 'warning'
          : status === VendorPaymentStatus.Cancelled
            ? 'default'
            : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={status === VendorPaymentStatus.Posted ? 'filled' : 'outlined'}
      label={paymentStatusLabel(status)}
      data-testid="vendor-payment-status-chip"
      data-status={status}
    />
  );
}
