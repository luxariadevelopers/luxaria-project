import { Chip } from '@mui/material';
import { deliveryStatusLabel } from './labels';
import { PurchaseOrderStatus } from './types';

type Props = {
  status: string;
};

/**
 * Receipt / delivery badge for the PO pipeline.
 * Highlights partial and fully received states (acceptance criteria).
 */
export function DeliveryStatusBadge({ status }: Props) {
  const label = deliveryStatusLabel(status);
  if (!label) {
    return (
      <Chip
        size="small"
        variant="outlined"
        color="default"
        label="—"
        data-testid="po-delivery-badge-empty"
      />
    );
  }

  const color =
    status === PurchaseOrderStatus.FullyReceived
      ? 'success'
      : status === PurchaseOrderStatus.PartiallyReceived
        ? 'warning'
        : 'info';

  const testId =
    status === PurchaseOrderStatus.FullyReceived
      ? 'po-delivery-badge-fully-received'
      : status === PurchaseOrderStatus.PartiallyReceived
        ? 'po-delivery-badge-partially-received'
        : 'po-delivery-badge-awaiting';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === PurchaseOrderStatus.FullyReceived ? 'filled' : 'outlined'
      }
      label={label}
      data-testid={testId}
    />
  );
}
