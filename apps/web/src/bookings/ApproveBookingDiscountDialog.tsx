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
import { useApproveBookingDiscount } from './useBookings';

const schema = z.object({
  comment: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  booking: PublicBooking | null;
  onDone?: () => void;
};

/** `POST /bookings/:id/approve-discount` — `booking.approve` */
export function ApproveBookingDiscountDialog({
  open,
  onClose,
  booking,
  onDone,
}: Props) {
  const approve = useApproveBookingDiscount();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { comment: '' },
  });

  useEffect(() => {
    if (!open) reset({ comment: '' });
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!booking) return;
    try {
      await approve.mutateAsync({
        id: booking.id,
        input: { comment: values.comment?.trim() || null },
      });
      success('Discount approved — booking moved to hold');
      onClose();
      onDone?.();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Approve discount — {booking?.bookingNumber}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Requires <code>booking.approve</code>. Nest moves the booking to{' '}
            <strong>hold</strong> so it can be marked reserved.
          </Alert>
          <FormTextField
            name="comment"
            control={control}
            label="Comment (optional)"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={approve.isPending}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={approve.isPending}
          >
            {approve.isPending ? 'Approving…' : 'Approve discount'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
