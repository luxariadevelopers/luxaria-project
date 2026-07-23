import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicWorkOrderAmendment } from './types';
import { useRejectWorkOrderAmendment } from './useWorkOrders';
import {
  reasonOnlySchema,
  type ReasonOnlyFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  amendment: PublicWorkOrderAmendment | null;
};

export function RejectAmendmentDialog({ open, onClose, amendment }: Props) {
  const reject = useRejectWorkOrderAmendment();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } = useForm<ReasonOnlyFormValues>({
    resolver: zodResolver(reasonOnlySchema),
    defaultValues: { reason: '' },
  });

  const onSubmit = async (values: ReasonOnlyFormValues) => {
    if (!amendment) return;
    try {
      await reject.mutateAsync({
        amendmentId: amendment.id,
        reason: values.reason ?? undefined,
      });
      success('Amendment rejected (commercial snapshot unchanged)');
      reset();
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject amendment</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {amendment?.amendmentNumber ?? ''}
        </Typography>
        <FormTextField
          name="reason"
          control={control}
          label="Rejection reason (optional)"
          multiline
          minRows={3}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={reject.isPending}
        >
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
}
