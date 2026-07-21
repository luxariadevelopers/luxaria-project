import { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { BookingStatus } from '@/status';
import type { PublicBooking } from './types';
import { useCancelBooking } from './useBookings';

const schema = z.object({
  reason: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  booking: PublicBooking | null;
  onDone?: () => void;
};

/** `POST /bookings/:id/cancel` — `booking.create` */
export function CancelBookingDialog({
  open,
  onClose,
  booking,
  onDone,
}: Props) {
  const cancel = useCancelBooking();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (!open) reset({ reason: '' });
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!booking) return;
    try {
      await cancel.mutateAsync({
        id: booking.id,
        input: { reason: values.reason?.trim() || null },
      });
      success('Booking cancelled and unit released');
      onClose();
      onDone?.();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const bookedOrAgreement =
    booking?.status === BookingStatus.Booked ||
    booking?.status === BookingStatus.Agreement;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cancel {booking?.bookingNumber}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {bookedOrAgreement ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              Booked and agreement-stage cancellations must use the booking
              cancellation workflow under Sales → Cancellations.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              Requires <code>booking.create</code>. Available for hold,
              pending approval, and reserved bookings.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The unit will be released when the cancellation completes.
          </Typography>
          <FormTextField
            name="reason"
            control={control}
            label="Reason (optional)"
            multiline
            minRows={2}
            disabled={bookedOrAgreement}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={cancel.isPending}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={cancel.isPending || bookedOrAgreement}
          >
            {cancel.isPending ? 'Cancelling…' : 'Confirm cancel'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
