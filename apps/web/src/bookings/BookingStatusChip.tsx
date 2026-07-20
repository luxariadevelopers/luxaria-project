import { Chip } from '@mui/material';
import { bookingStatusLabel } from './labels';
import { BookingStatus } from './types';

type Props = {
  status: string;
};

function chipColour(
  status: string,
): 'default' | 'success' | 'warning' | 'info' | 'error' {
  switch (status) {
    case BookingStatus.Hold:
    case BookingStatus.PendingApproval:
      return 'warning';
    case BookingStatus.Reserved:
      return 'info';
    case BookingStatus.Booked:
    case BookingStatus.Agreement:
    case BookingStatus.Registered:
      return 'success';
    case BookingStatus.Expired:
    case BookingStatus.Cancelled:
      return 'error';
    default:
      return 'default';
  }
}

export function BookingStatusChip({ status }: Props) {
  return (
    <Chip
      size="small"
      label={bookingStatusLabel(status)}
      color={chipColour(status)}
      variant={status === BookingStatus.Registered ? 'filled' : 'outlined'}
      data-testid="booking-status-chip"
      data-status={status}
    />
  );
}
