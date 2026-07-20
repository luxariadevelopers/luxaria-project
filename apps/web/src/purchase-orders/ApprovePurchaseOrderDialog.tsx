import { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicPurchaseOrder } from './types';
import { useApprovePurchaseOrder } from './usePurchaseOrders';

const schema = z.object({
  comment: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  po: PublicPurchaseOrder | null;
  onDone?: () => void;
};

/**
 * `POST /:id/approve` — `purchase.approve`.
 * Issues the PO when the approval workflow is fully approved (no separate issue API).
 */
export function ApprovePurchaseOrderDialog({
  open,
  onClose,
  po,
  onDone,
}: Props) {
  const approve = useApprovePurchaseOrder();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { comment: '' },
  });

  useEffect(() => {
    if (!open) reset({ comment: '' });
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!po) return;
    try {
      const updated = await approve.mutateAsync({
        id: po.id,
        input: { comment: values.comment?.trim() || null },
      });
      success(
        updated.status === 'issued'
          ? 'Purchase order approved and issued'
          : 'Purchase order approval step completed',
      );
      onClose();
      onDone?.();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Approve {po?.purchaseOrderNumber}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Requires <code>purchase.approve</code>. When the approval request
            reaches fully approved, Nest sets status to <strong>issued</strong>{' '}
            (there is no separate issue endpoint or <code>purchase.issue</code>{' '}
            permission).
          </Alert>
          <FormTextField
            name="comment"
            control={control}
            label="Comment (optional)"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={approve.isPending}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={approve.isPending}
          >
            {approve.isPending ? 'Approving…' : 'Approve'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
