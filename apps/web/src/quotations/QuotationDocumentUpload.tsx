import { useRef } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { formatDate } from '@/format';
import type { PublicVendorQuotation } from './types';

type Props = {
  quotation: PublicVendorQuotation | null;
  canUpload: boolean;
  uploading?: boolean;
  onUpload: (file: File) => void | Promise<void>;
};

/**
 * Multipart upload against Nest `POST /vendor-quotations/:id/document`.
 */
export function QuotationDocumentUpload({
  quotation,
  canUpload,
  uploading = false,
  onUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const doc = quotation?.quotationDocument ?? null;

  return (
    <Stack spacing={1.5} data-testid="quotation-document-upload">
      <Typography variant="subtitle2">Quotation document</Typography>
      {doc ? (
        <Alert severity="success" variant="outlined">
          {doc.fileName}
          {doc.uploadedAt ? ` · uploaded ${formatDate(doc.uploadedAt)}` : ''}
        </Alert>
      ) : (
        <Alert severity="info" variant="outlined">
          No vendor quotation file attached yet.
        </Alert>
      )}

      {canUpload && quotation?.status === 'draft' ? (
        <>
          <Button
            variant="outlined"
            disabled={uploading || !quotation}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : doc ? 'Replace document' : 'Upload document'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) {
                void onUpload(file);
              }
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Requires quotation.manage. Max 10 MB (Nest).
          </Typography>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Upload is available on draft quotations with quotation.manage.
        </Typography>
      )}
    </Stack>
  );
}
