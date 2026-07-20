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
import type { PublicContributionReceipt } from './types';
import { useCancelContributionReceipt } from './useContributionReceipts';
import {
  contributionReceiptCancelSchema,
  type ContributionReceiptCancelFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  receipt: PublicContributionReceipt | null;
};

export function CancelContributionReceiptDialog({
  open,
  onClose,
  projectId,
  receipt,
}: Props) {
  const cancel = useCancelContributionReceipt(projectId);
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } =
    useForm<ContributionReceiptCancelFormValues>({
      resolver: zodResolver(contributionReceiptCancelSchema),
      defaultValues: { cancellationReason: '' },
    });

  useEffect(() => {
    if (!open) {
      reset({ cancellationReason: '' });
    }
  }, [open, reset]);

  const onSubmit = async (values: ContributionReceiptCancelFormValues) => {
    if (!receipt) return;
    try {
      await cancel.mutateAsync({
        id: receipt.id,
        input: { cancellationReason: values.cancellationReason },
      });
      success('Contribution receipt cancelled');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cancel {receipt?.receiptNumber}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Requires contribution_receipt.cancel. Posted receipts cannot be
            cancelled (Nest enforces).
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
