import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { getDocumentDownloadUrl } from '@/api/documents';
import { getErrorMessage } from '@/api/errors';
import { EmptyState } from '@/components/errors';
import {
  SiteExpenseAttachmentType,
  type PublicSiteExpenseAttachment,
  type PublicSiteExpenseVoucher,
} from './types';

type Props = {
  voucher: PublicSiteExpenseVoucher;
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

/** Signature attachments — display only; never mutated from review UI. */
export function SignaturesPanel({ voucher }: Props) {
  const signatures = voucher.attachments.filter(
    (a) => a.type === SiteExpenseAttachmentType.Signature,
  );

  if (signatures.length === 0) {
    return (
      <Box data-testid="expense-signatures-empty">
        <EmptyState
          title="No signature attached"
          description="This voucher has no signature evidence on file."
        />
      </Box>
    );
  }

  return (
    <Stack spacing={2} data-testid="expense-signatures-panel">
      <Typography variant="subtitle1">Signatures</Typography>
      {signatures.map((attachment, index) => (
        <SignatureCard
          key={attachment.id || `signature-${index}`}
          attachment={attachment}
        />
      ))}
    </Stack>
  );
}
