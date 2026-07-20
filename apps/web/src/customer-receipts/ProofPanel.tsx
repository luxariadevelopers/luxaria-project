import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { resolveUploadsUrl } from '@/print-pdf/resolveUploadsUrl';
import type { PublicCustomerReceipt } from './types';
import {
  canOpenReceiptPdf,
  canRegenerateReceiptPdf,
  isReceiptPosted,
} from './workflowActions';
import type { CustomerReceiptCapabilities } from './roleAccess';

type Props = {
  open: boolean;
  onClose: () => void;
  receipt: PublicCustomerReceipt | null;
  caps: CustomerReceiptCapabilities;
  regenerating?: boolean;
  onRegeneratePdf?: (receipt: PublicCustomerReceipt) => void;
};

/**
 * Supporting proof path + posted receipt PDF.
 * Nest has no dedicated customer-receipt upload route; create accepts
 * `receiptDocument` string. PDF is generated on post / regenerate-pdf.
 */
export function ProofPanel({
  open,
  onClose,
  receipt,
  caps,
  regenerating,
  onRegeneratePdf,
}: Props) {
  if (!receipt) return null;

  const pdfPath = receipt.receiptPdfPath || receipt.receiptDocument;
  const posted = isReceiptPosted(receipt);

  const openFile = () => {
    if (!pdfPath) return;
    window.open(resolveUploadsUrl(pdfPath), '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Proof & PDF — {receipt.receiptNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} data-testid="proof-panel">
          <Typography variant="body2" color="text.secondary">
            Supporting proof is stored as `receiptDocument`. Nest generates the
            official PDF when the collection is posted.
          </Typography>

          {posted ? (
            <Alert severity="success">
              Posted
              {receipt.postedAt
                ? ` · ${String(receipt.postedAt).slice(0, 10)}`
                : ''}
              {receipt.unallocatedAmount > 0
                ? ` · unallocated advance ${receipt.unallocatedAmount}`
                : ''}
            </Alert>
          ) : (
            <Alert severity="info" variant="outlined">
              Status: {receipt.status}. PDF available after post.
            </Alert>
          )}

          {receipt.receiptDocument ? (
            <Typography variant="body2">
              Proof path: {receipt.receiptDocument}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No supporting proof path on this receipt.
            </Typography>
          )}

          {canOpenReceiptPdf(receipt) ? (
            <Button
              variant="contained"
              onClick={openFile}
              data-testid="receipt-pdf-open"
            >
              Open receipt PDF / proof
            </Button>
          ) : null}

          {canRegenerateReceiptPdf(receipt, caps) && onRegeneratePdf ? (
            <Button
              variant="outlined"
              disabled={regenerating}
              onClick={() => onRegeneratePdf(receipt)}
            >
              {regenerating ? 'Regenerating…' : 'Regenerate PDF'}
            </Button>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
