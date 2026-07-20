import { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicBookingCancellation } from './types';
import { useRejectBookingCancellation } from './useBookingCancellations';
import {
  rejectCancellationSchema,
  type RejectCancellationFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  row: PublicBookingCancellation | null;
};

export function RejectCancellationDialog({ open, onClose, row }: Props) {
  const reject = useRejectBookingCancellation();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } =
    useForm<RejectCancellationFormValues>({
      resolver: zodResolver(rejectCancellationSchema),
      defaultValues: { reason: '' },
    });

  useEffect(() => {
    if (!open) reset({ reason: '' });
  }, [open, reset]);

  const onSubmit = async (values: RejectCancellationFormValues) => {
    if (!row) return;
    try {
      await reject.mutateAsync({
        id: row.id,
        input: { reason: values.reason.trim() },
      });
      success('Cancellation rejected');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Reject cancellation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormTextField
              name="reason"
              control={control}
              label="Rejection reason"
              multiline
              minRows={3}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button
            type="submit"
            color="error"
            variant="contained"
            disabled={reject.isPending}
          >
            Reject
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
