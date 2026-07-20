import { Chip } from '@mui/material';
import { purchaseRequestStatusLabel } from './labels';
import { PurchaseRequestStatus } from './types';

type Props = {
  status: string;
  partiallyApproved?: boolean;
};

export function PurchaseRequestStatusChip({
  status,
  partiallyApproved = false,
}: Props) {
  const color =
    status === PurchaseRequestStatus.Approved ||
    status === PurchaseRequestStatus.Closed
      ? 'success'
      : status === PurchaseRequestStatus.Rejected ||
          status === PurchaseRequestStatus.Cancelled
        ? 'default'
        : status === PurchaseRequestStatus.Returned ||
            status === PurchaseRequestStatus.Sourcing
          ? 'warning'
          : status === PurchaseRequestStatus.Submitted ||
              status === PurchaseRequestStatus.Reviewed
            ? 'info'
            : 'warning';

  const label =
    status === PurchaseRequestStatus.Approved && partiallyApproved
      ? 'Partially approved'
      : purchaseRequestStatusLabel(status);

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === PurchaseRequestStatus.Approved ||
        status === PurchaseRequestStatus.Closed
          ? 'filled'
          : 'outlined'
      }
      label={label}
      data-testid="purchase-request-status-chip"
    />
  );
}
