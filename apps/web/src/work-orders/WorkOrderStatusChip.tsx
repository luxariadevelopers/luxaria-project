import { Chip } from '@mui/material';
import { workOrderStatusLabel } from './labels';
import type { WorkOrderStatus } from './types';

type Props = {
  status: WorkOrderStatus;
};

export function WorkOrderStatusChip({ status }: Props) {
  const color =
    status === 'completed' || status === 'closed'
      ? 'success'
      : status === 'cancelled'
        ? 'error'
        : status === 'pending_approval'
          ? 'warning'
          : status === 'draft'
            ? 'default'
            : 'info';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === 'completed' || status === 'closed' ? 'filled' : 'outlined'
      }
      label={workOrderStatusLabel(status)}
      data-testid="work-order-status-chip"
    />
  );
}
