import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  RequestedVsApprovedGrid,
  type ApproveLineDecision,
} from './RequestedVsApprovedGrid';
import type { PublicPurchaseRequestItem } from './types';
import {
  defaultApproveFormValues,
  validateApprovePayload,
  type ApprovePurchaseRequestFormValues,
} from './validation';

type Props = {
  open: boolean;
  items: readonly PublicPurchaseRequestItem[];
  onClose: () => void;
  onConfirm: (values: {
    items: ApproveLineDecision[];
    notes?: string;
  }) => void | Promise<void>;
  loading?: boolean;
};

/**
 * Partial-approval dialog — each line approved qty ≤ requested.
 * Nest: `POST /purchase-requests/:id/approve` (`purchase.approve`).
 */
export function ApprovePurchaseRequestDialog({
  open,
  items,
  onClose,
  onConfirm,
  loading = false,
}: Props) {
  const [form, setForm] = useState<ApprovePurchaseRequestFormValues>(() =>
    defaultApproveFormValues(items),
  );
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(defaultApproveFormValues(items));
      setLineErrors({});
      setFormError(null);
    }
  }, [open, items]);

  const busy = loading || submitting;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="md"
      data-testid="purchase-request-approve-dialog"
    >
      <DialogTitle>Approve purchase request</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Set an approved quantity for each line (0 rejects the line).
            Approved quantity cannot exceed requested.
          </Typography>
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          <RequestedVsApprovedGrid
            items={items}
            decisions={form.items}
            lineErrors={lineErrors}
            disabled={busy}
            onDecisionChange={(lineId, approvedQuantity) => {
              setForm((prev) => ({
                ...prev,
                items: prev.items.map((row) =>
                  row.lineId === lineId
                    ? { ...row, approvedQuantity }
                    : row,
                ),
              }));
            }}
          />
          <TextField
            label="Approval notes"
            multiline
            minRows={2}
            fullWidth
            disabled={busy}
            value={form.notes ?? ''}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={busy}
          data-testid="purchase-request-approve-confirm"
          onClick={() => {
            const result = validateApprovePayload(items, form.items);
            setLineErrors(result.lineErrors);
            setFormError(result.formError);
            if (!result.ok || !result.payload) return;
            setSubmitting(true);
            void (async () => {
              try {
                await onConfirm({
                  items: result.payload!.items,
                  notes: form.notes?.trim() || undefined,
                });
                onClose();
              } finally {
                setSubmitting(false);
              }
            })();
          }}
        >
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
