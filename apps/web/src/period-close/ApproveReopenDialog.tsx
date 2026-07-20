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
import { useApprovePeriodReopen } from './usePeriodClose';
import {
  approvePeriodReopenSchema,
  type ApprovePeriodReopenFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  periodId: string | null;
  request: PublicPeriodReopenRequest | null;
};

export function ApproveReopenDialog({
  open,
  onClose,
  periodId,
  request,
}: Props) {
  const mut = useApprovePeriodReopen();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } =
    useForm<ApprovePeriodReopenFormValues>({
      resolver: zodResolver(approvePeriodReopenSchema),
      defaultValues: { approvalNote: '' },
    });

  useEffect(() => {
    if (!open) reset({ approvalNote: '' });
  }, [open, reset]);

  const onSubmit = async (values: ApprovePeriodReopenFormValues) => {
    if (!periodId || !request) return;
    try {
      await mut.mutateAsync({
        periodId,
        requestId: request.id,
        input: {
          approvalNote: values.approvalNote?.trim() || undefined,
        },
      });
      success('Period reopen approved');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Approve reopen</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Approver cannot be the same user as the requester (Nest rule).
          </Typography>
          {request ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Reason: {request.reason}
            </Typography>
          ) : null}
          <FormTextField
            name="approvalNote"
            control={control}
            label="Approval note (optional)"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mut.isPending}>
            Back
          </Button>
          <Button type="submit" variant="contained" disabled={mut.isPending}>
            {mut.isPending ? 'Approving…' : 'Approve reopen'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
