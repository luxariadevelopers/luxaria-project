import {
  Alert,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDate, formatInr } from '@/format';
import { findActiveBooking } from './bookedRestrictions';
import type { LinkedBooking } from './types';

type Props = {
  bookings: readonly LinkedBooking[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
  bookingRefId: string | null;
};

export function LinkedBookingPanel({
  bookings,
  loading,
  error,
  onRetry,
  canView,
  bookingRefId,
}: Props) {
  if (!canView) {
    return (
      <PermissionDenied
        title="Bookings unavailable"
        message="You need booking.view to see linked bookings for this unit."
      />
    );
  }

  if (loading) {
    return (
      <Stack alignItems="center" py={3}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} />;
  }

  const active = findActiveBooking(bookings);
  const primary =
    active ??
    bookings.find((b) => b.id === bookingRefId) ??
    bookings[0] ??
    null;

  return (
    <Stack spacing={1.5} data-testid="linked-booking-panel">
      <Typography variant="subtitle1">Linked booking</Typography>
      {!primary ? (
        <Alert severity="info">No bookings linked to this unit.</Alert>
      ) : (
        <Stack spacing={0.75}>
          {active ? (
            <Alert severity="warning">
              Active booking {active.bookingNumber} ({active.status}) controls
              inventory status — manual status changes are blocked.
            </Alert>
          ) : null}
          <Typography>
            <Link
              component={RouterLink}
              to={`/bookings?id=${encodeURIComponent(primary.id)}`}
              underline="hover"
            >
              {primary.bookingNumber}
            </Link>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Status: {primary.status}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Booking date: {formatDate(primary.bookingDate)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Approved price: {formatInr(primary.approvedPrice)}
          </Typography>
          {bookings.length > 1 ? (
            <Typography variant="caption" color="text.secondary">
              {bookings.length} booking records for this unit
            </Typography>
          ) : null}
        </Stack>
      )}
    </Stack>
  );
}
