import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicPurchaseOrder } from './types';
import { useCancelPurchaseOrder } from './usePurchaseOrders';

type Props = {
  open: boolean;
  onClose: () => void;
  po: PublicPurchaseOrder | null;
  onCancelled?: () => void;
};

/** `POST /:id/cancel` — `purchase.order` (no body). */
export function CancelPurchaseOrderDialog({
  open,
  onClose,
  po,
  onCancelled,
}: Props) {
  const cancel = useCancelPurchaseOrder();
  const { success, error: notifyError } = useNotify();

  const confirm = async () => {
    if (!po) return;
    try {
      await cancel.mutateAsync(po.id);
      success('Purchase order cancelled');
      onClose();
      onCancelled?.();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Cancel {po?.purchaseOrderNumber}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Requires <code>purchase.order</code>. Partially received POs with
          receipts cannot be cancelled (Nest enforces — close instead).
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={cancel.isPending}>
          Back
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => void confirm()}
          disabled={cancel.isPending}
        >
          {cancel.isPending ? 'Cancelling…' : 'Confirm cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
