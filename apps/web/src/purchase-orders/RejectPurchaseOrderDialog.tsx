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
import { z } from 'zod';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicPurchaseOrder } from './types';
import { useRejectPurchaseOrder } from './usePurchaseOrders';

const schema = z.object({
  reason: z.string().trim().min(1, 'Rejection reason is required').max(1000),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  po: PublicPurchaseOrder | null;
  onDone?: () => void;
};

/** `POST /:id/reject` — `purchase.approve`. */
export function RejectPurchaseOrderDialog({
  open,
  onClose,
  po,
  onDone,
}: Props) {
  const reject = useRejectPurchaseOrder();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (!open) reset({ reason: '' });
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!po) return;
    try {
      await reject.mutateAsync({
        id: po.id,
        input: { reason: values.reason },
      });
      success('Purchase order rejected');
      onClose();
      onDone?.();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject {po?.purchaseOrderNumber}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Requires <code>purchase.approve</code>. Rejected POs become editable
            as draft after corrections.
          </Typography>
          <FormTextField
            name="reason"
            control={control}
            label="Reason"
            required
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={reject.isPending}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={reject.isPending}
          >
            {reject.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
