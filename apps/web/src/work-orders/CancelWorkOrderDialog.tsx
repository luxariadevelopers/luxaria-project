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
import type { PublicWorkOrder } from './types';
import { useCancelWorkOrder } from './useWorkOrders';
import {
  reasonOnlySchema,
  type ReasonOnlyFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  workOrder: PublicWorkOrder | null;
};

export function CancelWorkOrderDialog({ open, onClose, workOrder }: Props) {
  const cancel = useCancelWorkOrder();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } = useForm<ReasonOnlyFormValues>({
    resolver: zodResolver(reasonOnlySchema),
    defaultValues: { reason: '' },
  });

  const onSubmit = async (values: ReasonOnlyFormValues) => {
    if (!workOrder) return;
    try {
      await cancel.mutateAsync({
        id: workOrder.id,
        reason: values.reason ?? undefined,
      });
      success('Work order cancelled');
      reset();
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cancel work order</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {workOrder?.workOrderNumber ?? ''}
        </Typography>
        <FormTextField
          name="reason"
          control={control}
          label="Cancellation reason (optional)"
          multiline
          minRows={3}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Back</Button>
        <Button
          color="error"
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={cancel.isPending}
        >
          Cancel work order
        </Button>
      </DialogActions>
    </Dialog>
  );
}
