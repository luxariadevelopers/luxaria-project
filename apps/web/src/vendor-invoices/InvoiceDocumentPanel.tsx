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
import type { PublicVendorInvoice } from './types';
import { useUpdateVendorInvoice } from './useVendorInvoices';
import { VendorInvoiceStatus } from './types';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  invoice: PublicVendorInvoice | null;
  canUpload: boolean;
};

/**
 * Invoice scan / supporting evidence.
 * Nest stores `invoiceDocument` as a path/document reference (no dedicated upload route).
 */
export function InvoiceDocumentPanel({
  open,
  onClose,
  projectId,
  invoice,
  canUpload,
}: Props) {
  const update = useUpdateVendorInvoice();
  const { success, error: notifyError } = useNotify();
  const [manualRef, setManualRef] = useState('');

  if (!invoice) return null;

  const attach = async (reference: string) => {
    const trimmed = reference.trim();
    if (!trimmed) return;
    try {
      await update.mutateAsync({
        id: invoice.id,
        input: { invoiceDocument: trimmed },
      });
      success('Invoice document attached');
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
    canUpload && invoice.status === VendorInvoiceStatus.Draft;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Invoice evidence — {invoice.documentNumber}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} data-testid="vendor-invoice-document-panel">
          <Typography variant="body2" color="text.secondary">
            Attach a scan of the vendor invoice (document.upload), then save
            the document id on the draft (vendor_invoice.create).
          </Typography>

          {invoice.invoiceDocument ? (
            <Alert severity="success">
              Current document reference: {invoice.invoiceDocument}
            </Alert>
          ) : (
            <Alert severity="info" variant="outlined">
              No invoice document attached yet.
            </Alert>
          )}

          {editable ? (
            <DocumentUploadPanel
              title="Upload invoice scan"
              multiple={false}
              context={{
                projectId,
                module: 'vendor_invoices',
                entityType: 'vendor_invoice',
                entityId: invoice.id,
                documentType: 'invoice_scan',
              }}
              onConfirmedChange={onConfirmedChange}
            />
          ) : null}

          {editable ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'flex-start' }}
            >
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
