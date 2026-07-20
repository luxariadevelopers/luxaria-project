import { Chip } from '@mui/material';
import { cancellationStatusLabel } from './labels';
import { BookingCancellationStatus } from './types';

type Props = {
  status: string;
};

export function CancellationStatusChip({ status }: Props) {
  const color =
    status === BookingCancellationStatus.UnitReleased
      ? 'success'
      : status === BookingCancellationStatus.RefundProcessed ||
          status === BookingCancellationStatus.Approved
        ? 'info'
        : status === BookingCancellationStatus.PendingApproval ||
            status === BookingCancellationStatus.Reviewed ||
            status === BookingCancellationStatus.Requested
          ? 'warning'
          : status === BookingCancellationStatus.Rejected ||
              status === BookingCancellationStatus.Cancelled
            ? 'default'
            : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === BookingCancellationStatus.UnitReleased
          ? 'filled'
          : 'outlined'
      }
      label={cancellationStatusLabel(status)}
      data-testid="cancellation-status-chip"
      data-status={status}
    />
  );
}
