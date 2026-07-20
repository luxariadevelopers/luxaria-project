import { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicPeriodReopenRequest } from './types';
import { useRejectPeriodReopen } from './usePeriodClose';
import {
  rejectPeriodReopenSchema,
  type RejectPeriodReopenFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  periodId: string | null;
  request: PublicPeriodReopenRequest | null;
};

export function RejectReopenDialog({
  open,
  onClose,
  periodId,
  request,
}: Props) {
  const mut = useRejectPeriodReopen();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } =
    useForm<RejectPeriodReopenFormValues>({
      resolver: zodResolver(rejectPeriodReopenSchema),
      defaultValues: { rejectionReason: '' },
    });

  useEffect(() => {
    if (!open) reset({ rejectionReason: '' });
  }, [open, reset]);

  const onSubmit = async (values: RejectPeriodReopenFormValues) => {
    if (!periodId || !request) return;
    try {
      await mut.mutateAsync({
        periodId,
        requestId: request.id,
        input: { rejectionReason: values.rejectionReason.trim() },
      });
      success('Reopen request rejected');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject reopen</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Rejection reason is required (Nest min 3 characters).
          </Typography>
          <FormTextField
            name="rejectionReason"
            control={control}
            label="Rejection reason"
            required
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mut.isPending}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={mut.isPending}
          >
            {mut.isPending ? 'Rejecting…' : 'Reject request'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
