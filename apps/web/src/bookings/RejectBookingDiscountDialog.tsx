import { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicBooking } from './types';
import { useRejectBookingDiscount } from './useBookings';

const schema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(1000),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  booking: PublicBooking | null;
  onDone?: () => void;
};

/** `POST /bookings/:id/reject-discount` — `booking.approve` */
export function RejectBookingDiscountDialog({
  open,
  onClose,
  booking,
  onDone,
}: Props) {
  const reject = useRejectBookingDiscount();
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
      await reject.mutateAsync({
        id: booking.id,
        input: { reason: values.reason.trim() },
      });
      success('Discount rejected — booking cancelled');
      onClose();
      onDone?.();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject discount — {booking?.bookingNumber}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Requires <code>booking.approve</code>. Nest cancels the booking and
            releases the unit.
          </Alert>
          <FormTextField
            name="reason"
            control={control}
            label="Reason"
            multiline
            minRows={2}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={reject.isPending}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={reject.isPending}
          >
            {reject.isPending ? 'Rejecting…' : 'Reject discount'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
