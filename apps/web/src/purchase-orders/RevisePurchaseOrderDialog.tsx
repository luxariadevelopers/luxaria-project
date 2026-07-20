import { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { assertPurchaseOrderNotSilentlyEditable } from './immutableState';
import { PURCHASE_ORDER_ROUTES } from './routes';
import type { PublicPurchaseOrder } from './types';
import { useRevisePurchaseOrder } from './usePurchaseOrders';
import {
  poReviseSchema,
  type PoReviseFormValues,
} from './reviseValidation';

type Props = {
  open: boolean;
  onClose: () => void;
  po: PublicPurchaseOrder | null;
};

/**
 * Creates a new draft revision via `POST /:id/revise` (`purchase.order`).
 * Issued POs are never patched in place.
 */
export function RevisePurchaseOrderDialog({ open, onClose, po }: Props) {
  const revise = useRevisePurchaseOrder();
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<PoReviseFormValues>({
    resolver: zodResolver(poReviseSchema),
    defaultValues: {
      orderDate: '',
      expectedDeliveryDate: '',
      paymentTerms: '',
      taxes: 0,
      freight: 0,
      discount: 0,
      terms: '',
    },
  });

  useEffect(() => {
    if (po && open) {
      reset({
        orderDate: po.orderDate,
        expectedDeliveryDate: po.expectedDeliveryDate,
        paymentTerms: po.paymentTerms ?? '',
        taxes: po.taxes,
        freight: po.freight,
        discount: po.discount,
        terms: po.terms ?? '',
      });
    }
  }, [po, open, reset]);

  const onSubmit = async (values: PoReviseFormValues) => {
    if (!po) return;
    const gate = assertPurchaseOrderNotSilentlyEditable(po.status);
    if (gate.ok) {
      notifyError(
        'Only issued purchase orders can be revised. Drafts may be edited directly.',
      );
      return;
    }
    try {
      const created = await revise.mutateAsync({
        id: po.id,
        input: {
          orderDate: values.orderDate,
          expectedDeliveryDate: values.expectedDeliveryDate,
          paymentTerms: values.paymentTerms.trim() || null,
          taxes: values.taxes,
          freight: values.freight,
          discount: values.discount,
          terms: values.terms.trim() || null,
        },
      });
      success(
        `Revision r${created.revisionNumber} created as draft — re-approval required`,
      );
      onClose();
      navigate(PURCHASE_ORDER_ROUTES.detail(created.id));
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Revise {po?.purchaseOrderNumber} (r{po?.revisionNumber})
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Issued POs cannot be silently edited. This supersedes the current
            revision and opens a new draft (total{' '}
            {formatInr(po?.total ?? 0)}). Requires <code>purchase.order</code>.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Line items are copied from the issued PO when omitted. Adjust header
            dates and charges below if needed.
          </Typography>
          <FormTextField
            name="orderDate"
            control={control}
            label="Order date"
            type="date"
            required
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ mb: 2 }}
          />
          <FormTextField
            name="expectedDeliveryDate"
            control={control}
            label="Expected delivery"
            type="date"
            required
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ mb: 2 }}
          />
          <FormTextField
            name="paymentTerms"
            control={control}
            label="Payment terms"
            sx={{ mb: 2 }}
          />
          <FormTextField
            name="taxes"
            control={control}
            label="Taxes"
            type="number"
            sx={{ mb: 2 }}
          />
          <FormTextField
            name="freight"
            control={control}
            label="Freight"
            type="number"
            sx={{ mb: 2 }}
          />
          <FormTextField
            name="discount"
            control={control}
            label="Discount"
            type="number"
            sx={{ mb: 2 }}
          />
          <FormTextField
            name="terms"
            control={control}
            label="Terms & conditions"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={revise.isPending}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={revise.isPending}
          >
            {revise.isPending ? 'Revising…' : 'Create revision draft'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
