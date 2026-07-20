import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { getDocumentDownloadUrl } from '@/api/documents';
import { getErrorMessage } from '@/api/errors';
import { EmptyState } from '@/components/errors';
import { attachmentTypeLabel } from './labels';
import {
  SiteExpenseAttachmentType,
  type PublicSiteExpenseAttachment,
  type PublicSiteExpenseVoucher,
} from './types';

type Props = {
  voucher: PublicSiteExpenseVoucher;
};

function isPreviewableMime(mime: string | null): boolean {
  if (!mime) return false;
  return (
    mime.startsWith('image/') ||
    mime === 'application/pdf' ||
    mime === 'image/jpeg' ||
    mime === 'image/png'
  );
}

function BillAttachmentCard({
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

  const label =
    attachment.fileName?.trim() ||
    attachment.filePath?.trim() ||
    attachmentTypeLabel(attachment.type);

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      data-testid={`expense-bill-${attachment.id || 'row'}`}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {attachmentTypeLabel(attachment.type)}
          {attachment.mimeType ? ` · ${attachment.mimeType}` : ''}
        </Typography>
        {loading ? <CircularProgress size={20} /> : null}
        {error ? (
          <Alert severity="warning" variant="outlined">
            {error}
          </Alert>
        ) : null}
        {url && isPreviewableMime(attachment.mimeType) ? (
          attachment.mimeType === 'application/pdf' ? (
            <Box
              component="iframe"
              title={label}
              src={url}
              sx={{ width: '100%', height: 360, border: 0 }}
            />
          ) : (
            <Box
              component="img"
              alt={label}
              src={url}
              sx={{
                maxWidth: '100%',
                maxHeight: 360,
                objectFit: 'contain',
                borderRadius: 1,
              }}
            />
          )
        ) : null}
        {url ? (
          <Button
            component={Link}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
          >
            Open original
          </Button>
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
 * Bill / photo evidence preview (read-only).
 * Does not upload or mutate attachments — approved evidence stays unchanged.
 */
export function BillPreview({ voucher }: Props) {
  const bills = voucher.attachments.filter(
    (a) =>
      a.type === SiteExpenseAttachmentType.Bill ||
      a.type === SiteExpenseAttachmentType.Photo ||
      a.type === SiteExpenseAttachmentType.Other,
  );

  if (bills.length === 0) {
    return (
      <Box data-testid="expense-bill-empty">
        <EmptyState
          title="No bill or photo attached"
          description="This voucher has no bill/photo evidence to preview."
        />
      </Box>
    );
  }

  return (
    <Stack spacing={2} data-testid="expense-bill-preview">
      <Typography variant="subtitle1">Bill & photo evidence</Typography>
      {bills.map((attachment, index) => (
        <BillAttachmentCard
          key={attachment.id || `${attachment.type}-${index}`}
          attachment={attachment}
        />
      ))}
    </Stack>
  );
}
