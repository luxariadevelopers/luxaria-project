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
import type { PublicPettyCashFundTransfer } from './types';
import { useCancelPettyCashFundTransfer } from './usePettyCashTransfers';
import {
  transferCancelSchema,
  type TransferCancelFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  transfer: PublicPettyCashFundTransfer | null;
};

export function CancelTransferDialog({
  open,
  onClose,
  projectId,
  transfer,
}: Props) {
  const cancel = useCancelPettyCashFundTransfer(projectId);
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } =
    useForm<TransferCancelFormValues>({
      resolver: zodResolver(transferCancelSchema),
      defaultValues: { cancellationReason: '' },
    });

  useEffect(() => {
    if (!open) {
      reset({ cancellationReason: '' });
    }
  }, [open, reset]);

  const onSubmit = async (values: TransferCancelFormValues) => {
    if (!transfer) return;
    try {
      await cancel.mutateAsync({
        id: transfer.id,
        input: { cancellationReason: values.cancellationReason },
      });
      success('Fund transfer cancelled');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cancel {transfer?.transferNumber}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Requires petty_cash.fund. Posted transfers cannot be cancelled
            (Nest enforces).
          </Typography>
          <FormTextField
            name="cancellationReason"
            control={control}
            label="Cancellation reason"
            required
            multiline
            minRows={2}
            helperText="Minimum 5 characters"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={cancel.isPending}>
            Keep
          </Button>
          <Button
            type="submit"
            color="error"
            variant="contained"
            disabled={cancel.isPending}
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel transfer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
