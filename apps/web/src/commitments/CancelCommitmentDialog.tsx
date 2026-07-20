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
import type { PublicCommitment } from './types';
import { useCancelCommitment } from './useCommitments';
import {
  commitmentCancelSchema,
  type CommitmentCancelFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  commitment: PublicCommitment | null;
};

export function CancelCommitmentDialog({
  open,
  onClose,
  projectId,
  commitment,
}: Props) {
  const cancel = useCancelCommitment(projectId);
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } =
    useForm<CommitmentCancelFormValues>({
      resolver: zodResolver(commitmentCancelSchema),
      defaultValues: { cancellationReason: '' },
    });

  useEffect(() => {
    if (!open) {
      reset({ cancellationReason: '' });
    }
  }, [open, reset]);

  const onSubmit = async (values: CommitmentCancelFormValues) => {
    if (!commitment) return;
    try {
      await cancel.mutateAsync({
        id: commitment.id,
        input: { cancellationReason: values.cancellationReason },
      });
      success('Commitment cancelled');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cancel {commitment?.commitmentNumber}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Requires contribution_commitment.cancel. Approved commitments with
            receipts cannot be cancelled (Nest enforces).
          </Typography>
          <FormTextField
            name="cancellationReason"
            control={control}
            label="Cancellation reason"
            required
            multiline
            minRows={2}
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
            disabled={cancel.isPending}
          >
            {cancel.isPending ? 'Cancelling…' : 'Confirm cancel'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
