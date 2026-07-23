import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { PublicDocument } from '@luxaria/shared-types';
import { getDocumentDownloadUrl } from '@/api/documents';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState } from '@/components/errors';
import { DocumentUploadPanel } from '@/documents';
import {
  SiteExpenseAttachmentType,
  type PublicSiteExpenseAttachment,
  type PublicSiteExpenseVoucher,
} from './types';

type Props = {
  voucher: PublicSiteExpenseVoucher;
  /** When true, show presign/confirm upload for draft/returned vouchers. */
  editable?: boolean;
  requiresSignature?: boolean;
  saving?: boolean;
  onAttachSignature?: (document: PublicDocument) => void | Promise<void>;
};

function SignatureCard({
  attachment,
}: {
  attachment: PublicSiteExpenseAttachment;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attachment.documentId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getDocumentDownloadUrl(attachment.documentId)
      .then((result) => {
        if (!cancelled) setUrl(result.download.url);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attachment.documentId]);

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      data-testid={`expense-signature-${attachment.id || 'row'}`}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {attachment.fileName?.trim() || 'Signature'}
        </Typography>
        {loading ? <CircularProgress size={20} /> : null}
        {error ? (
          <Alert severity="warning" variant="outlined">
            {error}
          </Alert>
        ) : null}
        {url ? (
          <Box
            component="img"
            alt="Signature"
            src={url}
            sx={{
              maxWidth: '100%',
              maxHeight: 200,
              objectFit: 'contain',
              bgcolor: 'background.default',
              borderRadius: 1,
            }}
          />
        ) : null}
        {!attachment.documentId && attachment.filePath ? (
          <Typography variant="body2" color="text.secondary">
            Storage path: {attachment.filePath}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}

/**
 * Signature attachments — display always; capture+upload when editable.
 * Nest has no dedicated signatures endpoint; attach via PATCH attachments.
 */
export function SignaturesPanel({
  voucher,
  editable = false,
  requiresSignature = false,
  saving = false,
  onAttachSignature,
}: Props) {
  const { hasPermission } = useAuth();
  const canUpload = hasPermission('document.upload');
  const [pendingDoc, setPendingDoc] = useState<PublicDocument | null>(null);

  const signatures = voucher.attachments.filter(
    (a) => a.type === SiteExpenseAttachmentType.Signature,
  );

  const savePending = () => {
    if (!pendingDoc || !onAttachSignature) return;
    void (async () => {
      await onAttachSignature(pendingDoc);
      setPendingDoc(null);
    })();
  };

  return (
    <Stack spacing={2} data-testid="expense-signatures-panel">
      <Typography variant="subtitle1">
        Beneficiary / engineer signature
        {requiresSignature ? ' *' : ''}
      </Typography>

      {signatures.length === 0 ? (
        <Box data-testid="expense-signatures-empty">
          <EmptyState
            title="No signature attached"
            description={
              requiresSignature
                ? 'This category requires a signature before submit.'
                : 'This voucher has no signature evidence on file.'
            }
          />
        </Box>
      ) : (
        signatures.map((attachment, index) => (
          <SignatureCard
            key={attachment.id || `signature-${index}`}
            attachment={attachment}
          />
        ))
      )}

      {editable ? (
        canUpload ? (
          <Stack spacing={1.5}>
            <DocumentUploadPanel
              context={{
                module: 'site_expense_vouchers',
                entityType: 'site_expense_voucher',
                entityId: voucher.id,
                documentType: 'signature',
                projectId: voucher.projectId,
              }}
              title="Upload signature"
              multiple={false}
              onConfirmedChange={(docs) => setPendingDoc(docs[0] ?? null)}
            />
            {pendingDoc && onAttachSignature ? (
              <Button
                variant="contained"
                disabled={saving}
                onClick={savePending}
                sx={{ alignSelf: 'flex-start' }}
                data-testid="expense-signature-save"
              >
                {saving ? 'Saving…' : 'Attach signature to voucher'}
              </Button>
            ) : null}
          </Stack>
        ) : (
          <Alert severity="warning" variant="outlined">
            Need document.upload to capture a signature.
          </Alert>
        )
      ) : null}
    </Stack>
  );
}
