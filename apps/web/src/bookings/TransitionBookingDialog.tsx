import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { bookingStatusLabel } from './labels';
import type { PublicBooking } from './types';
import { useTransitionBooking } from './useBookings';
import {
  transitionActionLabel,
  transitionTargetStatus,
  type BookingActionId,
} from './workflowActions';

type Props = {
  open: boolean;
  onClose: () => void;
  booking: PublicBooking | null;
  action: BookingActionId | null;
  onDone?: () => void;
};

/** `POST /bookings/:id/transition` — `booking.create` */
export function TransitionBookingDialog({
  open,
  onClose,
  booking,
  action,
  onDone,
}: Props) {
  const transition = useTransitionBooking();
  const { success, error: notifyError } = useNotify();

  const target = action ? transitionTargetStatus(action) : null;
  const label = action ? transitionActionLabel(action) : 'Transition';

  const confirm = async () => {
    if (!booking || !target) return;
    try {
      await transition.mutateAsync({
        id: booking.id,
        input: { status: target },
      });
      success(`Booking moved to ${bookingStatusLabel(target)}`);
      onClose();
      onDone?.();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{label}</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Requires <code>booking.create</code>. Nest validates the status
          transition authoritatively.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Move <strong>{booking?.bookingNumber}</strong>
          {target ? (
            <>
              {' '}
              to <strong>{bookingStatusLabel(target)}</strong>?
            </>
          ) : null}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={transition.isPending}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={() => void confirm()}
          disabled={transition.isPending || !target}
        >
          {transition.isPending ? 'Updating…' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
