import { Chip } from '@mui/material';
import { paymentStatusLabel } from './labels';
import { ContractorPaymentStatus } from './types';

type Props = {
  status: string;
};

export function PaymentStatusChip({ status }: Props) {
  const color =
    status === ContractorPaymentStatus.Posted
      ? 'success'
      : status === ContractorPaymentStatus.Released ||
          status === ContractorPaymentStatus.Verified
        ? 'info'
        : status === ContractorPaymentStatus.Approval
          ? 'warning'
          : status === ContractorPaymentStatus.Cancelled
            ? 'default'
            : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === ContractorPaymentStatus.Posted ? 'filled' : 'outlined'
      }
      label={paymentStatusLabel(status)}
      data-testid="contractor-payment-status-chip"
      data-status={status}
    />
  );
}
