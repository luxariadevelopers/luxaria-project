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
import { periodDisplayLabel } from './labels';
import type { PublicAccountingPeriod } from './types';
import { useRequestPeriodReopen } from './usePeriodClose';
import {
  requestPeriodReopenSchema,
  type RequestPeriodReopenFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  period: PublicAccountingPeriod | null;
};

/** Nest `POST …/reopen-requests` — reason required (min 5). */
export function ReopenRequestDialog({ open, onClose, period }: Props) {
  const mut = useRequestPeriodReopen();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } =
    useForm<RequestPeriodReopenFormValues>({
      resolver: zodResolver(requestPeriodReopenSchema),
      defaultValues: { reason: '' },
    });

  useEffect(() => {
    if (!open) reset({ reason: '' });
  }, [open, reset]);

  const onSubmit = async (values: RequestPeriodReopenFormValues) => {
    if (!period) return;
    try {
      await mut.mutateAsync({
        periodId: period.id,
        input: { reason: values.reason.trim() },
      });
      success('Reopen request submitted');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="reopen-request-dialog"
    >
      <DialogTitle>
        Request reopen — {period ? periodDisplayLabel(period) : 'period'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Exceptional reopen requires a reason (Nest min 5 characters) and a
            separate approver (`period_closure.approve_reopen`).
          </Typography>
          <FormTextField
            name="reason"
            control={control}
            label="Reason"
            required
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mut.isPending}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mut.isPending}
            data-testid="reopen-request-submit"
          >
            {mut.isPending ? 'Submitting…' : 'Submit request'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
