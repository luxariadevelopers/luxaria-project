import { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { getDocumentDownloadUrl } from '@/api/documents';
import { getErrorMessage } from '@/api/errors';

type Props = {
  documentId: string | null | undefined;
  checksum?: string | null;
  label?: string;
  canDownload: boolean;
};

/**
 * Lightweight signature image preview via
 * `GET /documents/:id/download-url` (`document.download`).
 */
export function SignaturePreview({
  documentId,
  checksum,
  label = 'Recipient signature',
  canDownload,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);

    if (!documentId) {
      return;
    }
    if (!canDownload) {
      setError('Missing permission document.download');
      return;
    }

    setLoading(true);
    void getDocumentDownloadUrl(documentId)
      .then((result) => {
        if (!cancelled) setUrl(result.download.url);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Failed to load signature'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, canDownload]);

  if (!documentId) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        data-testid="signature-preview-empty"
      >
        No {label.toLowerCase()} attached
      </Typography>
    );
  }

  return (
    <Stack spacing={1} data-testid="signature-preview">
      <Typography variant="subtitle2">{label}</Typography>
      {checksum ? (
        <Typography variant="caption" color="text.secondary">
          SHA-256: {checksum.slice(0, 12)}…
        </Typography>
      ) : null}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={22} />
        </Box>
      ) : null}
      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}
      {url ? (
        <Box
          component="img"
          src={url}
          alt={label}
          sx={{
            maxWidth: 280,
            maxHeight: 120,
            objectFit: 'contain',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
            bgcolor: 'background.paper',
          }}
        />
      ) : null}
    </Stack>
  );
}
