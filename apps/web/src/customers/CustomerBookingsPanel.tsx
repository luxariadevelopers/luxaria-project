import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDate, formatInr } from '@/format';
import type { CustomerBookingRow } from './types';

type Props = {
  bookings: readonly CustomerBookingRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
};

export function CustomerBookingsPanel({
  bookings,
  loading,
  error,
  onRetry,
  canView,
}: Props) {
  if (!canView) {
    return (
      <PermissionDenied
        title="Bookings unavailable"
        message="You need booking.view to list this customer’s bookings."
        showHomeLink={false}
      />
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading bookings…
      </Typography>
    );
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No bookings"
        description="Bookings linked to this customer will appear here."
      />
    );
  }

  return (
    <Stack spacing={1} data-testid="customer-bookings-panel">
      <Typography variant="body2" color="text.secondary">
        From <code>GET /bookings?customerId=</code> (<code>booking.view</code>).
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Number</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Booking</TableCell>
            <TableCell align="right">Agreed</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bookings.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.bookingNumber}</TableCell>
              <TableCell>
                {row.bookingDate ? formatDate(row.bookingDate) : '—'}
              </TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell align="right">{formatInr(row.bookingAmount)}</TableCell>
              <TableCell align="right">{formatInr(row.agreedPrice)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
