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
import type { PublicPettyCashFundTransfer } from './types';
import { useUpdatePettyCashFundTransfer } from './usePettyCashTransfers';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  transfer: PublicPettyCashFundTransfer | null;
  canUpload: boolean;
};

/**
 * Payment proof for draft transfers.
 * Nest stores `paymentProof` as a path/document reference (no dedicated upload route).
 * Upload via documents module, then PATCH the transfer with the document id.
 */
export function ProofUploadPanel({
  open,
  onClose,
  projectId,
  transfer,
  canUpload,
}: Props) {
  const update = useUpdatePettyCashFundTransfer(projectId);
  const { success, error: notifyError } = useNotify();
  const [manualProof, setManualProof] = useState('');

  if (!transfer) return null;

  const attachProof = async (reference: string) => {
    const trimmed = reference.trim();
    if (!trimmed) return;
    try {
      await update.mutateAsync({
        id: transfer.id,
        input: { paymentProof: trimmed },
      });
      success('Payment proof attached to transfer');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const onConfirmedChange = (documents: PublicDocument[]) => {
    const latest = documents[documents.length - 1];
    if (!latest) return;
    void attachProof(latest.id);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Payment proof — {transfer.transferNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} data-testid="petty-cash-proof-upload">
          <Typography variant="body2" color="text.secondary">
            Proof is required before verify. Upload a document
            (document.upload) or paste a path / document id, then save on the
            draft transfer (petty_cash.fund).
          </Typography>

          {transfer.paymentProof ? (
            <Alert severity="success">
              Current proof reference: {transfer.paymentProof}
            </Alert>
          ) : (
            <Alert severity="info" variant="outlined">
              No payment proof attached yet.
            </Alert>
          )}

          {canUpload && transfer.status === 'draft' ? (
            <DocumentUploadPanel
              title="Upload proof"
              multiple={false}
              context={{
                projectId,
                module: 'petty_cash',
                entityType: 'petty_cash_fund_transfer',
                entityId: transfer.id,
                documentType: 'payment_proof',
              }}
              onConfirmedChange={onConfirmedChange}
            />
          ) : null}

          {transfer.status === 'draft' ? (
            <Stack spacing={1}>
              <TextField
                label="Or paste proof path / document id"
                value={manualProof}
                onChange={(e) => setManualProof(e.target.value)}
                size="small"
                fullWidth
              />
              <Button
                variant="outlined"
                disabled={update.isPending || !manualProof.trim()}
                onClick={() => void attachProof(manualProof)}
              >
                {update.isPending ? 'Saving…' : 'Attach reference'}
              </Button>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Proof can only be updated while the transfer is draft.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
