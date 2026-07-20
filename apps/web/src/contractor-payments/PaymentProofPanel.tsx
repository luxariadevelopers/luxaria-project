import { useState } from 'react';
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
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { DocumentUploadPanel } from '@/documents';
import type { PublicDocument } from '@luxaria/shared-types';
import type { PublicContractorPayment } from './types';
import { ContractorPaymentStatus } from './types';
import { useUpdateContractorPayment } from './useContractorPayments';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  payment: PublicContractorPayment | null;
  canUpload: boolean;
};

/**
 * Payment proof — Nest stores `paymentProof` as document id/path (no multipart).
 * Required before `POST …/release`.
 */
export function PaymentProofPanel({
  open,
  onClose,
  projectId,
  payment,
  canUpload,
}: Props) {
  const update = useUpdateContractorPayment();
  const { success, error: notifyError } = useNotify();
  const [manualRef, setManualRef] = useState('');

  if (!payment) return null;

  const attach = async (reference: string) => {
    const trimmed = reference.trim();
    if (!trimmed) return;
    try {
      await update.mutateAsync({
        id: payment.id,
        input: { paymentProof: trimmed },
      });
      success('Payment proof attached');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const onConfirmedChange = (documents: PublicDocument[]) => {
    const latest = documents[documents.length - 1];
    if (!latest) return;
    void attach(latest.id);
  };

  const editable =
    canUpload && payment.status === ContractorPaymentStatus.Draft;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Payment proof — {payment.paymentNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} data-testid="contractor-payment-proof-panel">
          <Typography variant="body2" color="text.secondary">
            Upload via documents module (document.upload), then PATCH the draft
            (payment.release). Required before bank release.
          </Typography>
          {payment.paymentProof ? (
            <Alert severity="success">
              Current proof: {payment.paymentProof}
            </Alert>
          ) : (
            <Alert severity="info" variant="outlined">
              No payment proof attached yet.
            </Alert>
          )}
          {editable ? (
            <DocumentUploadPanel
              title="Upload proof"
              multiple={false}
              context={{
                projectId,
                module: 'contractor_payments',
                entityType: 'contractor_payment',
                entityId: payment.id,
                documentType: 'payment_proof',
              }}
              onConfirmedChange={onConfirmedChange}
            />
          ) : null}
          {editable ? (
            <Stack direction="row" spacing={1}>
              <TextField
                label="Or paste document id / path"
                fullWidth
                size="small"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
              />
              <Button
                variant="outlined"
                disabled={!manualRef.trim() || update.isPending}
                onClick={() => void attach(manualRef)}
              >
                Save
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
