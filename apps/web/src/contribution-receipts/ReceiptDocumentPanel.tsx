import { useRef } from 'react';
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
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { resolveUploadsUrl } from '@/print-pdf/resolveUploadsUrl';
import type { PublicContributionReceipt } from './types';
import { useUploadContributionReceiptDocument } from './useContributionReceipts';
import { canDownloadReceiptPdf, isReceiptPosted } from './workflowActions';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  receipt: PublicContributionReceipt | null;
  canUpload: boolean;
};

/**
 * Document upload + receipt PDF preview/open.
 * Nest generates PDF on post (`receiptPdfPath`); no authenticated download route.
 */
export function ReceiptDocumentPanel({
  open,
  onClose,
  projectId,
  receipt,
  canUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadContributionReceiptDocument(projectId);
  const { success, error: notifyError } = useNotify();

  if (!receipt) return null;

  const pdfPath = receipt.receiptPdfPath || receipt.receiptDocument;
  const canOpen = Boolean(pdfPath);
  const posted = isReceiptPosted(receipt);

  const openFile = () => {
    if (!pdfPath) return;
    window.open(resolveUploadsUrl(pdfPath), '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Documents — {receipt.receiptNumber}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} data-testid="receipt-document-panel">
          <Typography variant="body2" color="text.secondary">
            Upload supporting files with contribution_receipt.upload_document.
            PDF is generated when the receipt is posted.
          </Typography>

          {posted ? (
            <Alert severity="success" data-testid="receipt-posted-state">
              Posted
              {receipt.balancesApplied ? ' · balances applied' : ''}
              {receipt.postedAt
                ? ` · ${receipt.postedAt.slice(0, 10)}`
                : ''}
            </Alert>
          ) : (
            <Alert severity="info" variant="outlined">
              Status: {receipt.status}. PDF available after post.
            </Alert>
          )}

          {receipt.receiptDocument ? (
            <Typography variant="body2">
              Document path: {receipt.receiptDocument}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No supporting document uploaded yet.
            </Typography>
          )}

          {canDownloadReceiptPdf(receipt) ? (
            <Button
              variant="contained"
              onClick={openFile}
              data-testid="receipt-pdf-open"
            >
              Open receipt PDF
            </Button>
          ) : canOpen ? (
            <Button variant="outlined" onClick={openFile}>
              Open document
            </Button>
          ) : null}

          {canUpload && receipt.status !== 'cancelled' ? (
            <>
              <Button
                variant="outlined"
                disabled={upload.isPending}
                onClick={() => inputRef.current?.click()}
              >
                {upload.isPending ? 'Uploading…' : 'Upload document'}
              </Button>
              <input
                ref={inputRef}
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  void upload
                    .mutateAsync({ id: receipt.id, file })
                    .then(() => success('Document uploaded'))
                    .catch((err: unknown) =>
                      notifyError(getErrorMessage(err)),
                    );
                }}
              />
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Upload requires contribution_receipt.upload_document.
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
