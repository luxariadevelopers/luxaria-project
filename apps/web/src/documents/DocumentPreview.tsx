import { useEffect } from 'react';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import type { PublicDocument } from '@luxaria/shared-types';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { usePresignedDownload } from './usePresignedDownload';

type Props = {
  document: PublicDocument;
};

/**
 * Preview/download via short-lived private GET URL (never a public object URL
 * or raw S3 key). Refreshes when Nest `expiresIn` elapses.
 */
export function DocumentPreview({ document }: Props) {
  const { hasPermission } = useAuth();
  const canDownload = hasPermission('document.download');
  const isImage = document.mimeType.startsWith('image/');
  const isPdf = document.mimeType === 'application/pdf';
  const canPreviewInline = isImage || isPdf;

  const { url, loading, error, denied, ensureUrl, clear } = usePresignedDownload(
    {
      documentId: document.id,
      status: String(document.status),
      canDownload,
    },
  );

  useEffect(() => {
    clear();
  }, [document.id, clear]);

  const openDownload = async () => {
    const next = await ensureUrl();
    if (!next) return;
    if (!canPreviewInline) {
      window.open(next, '_blank', 'noopener,noreferrer');
    }
  };

  if (denied) {
    return (
      <PermissionDenied
        title="Download unavailable"
        message={error ?? 'Missing permission document.download'}
        showHomeLink={false}
      />
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{document.originalFileName}</Typography>
      <Typography variant="caption" color="text.secondary">
        {document.mimeType} · v{document.version} · {document.status} · scan{' '}
        {document.malwareScanStatus}
      </Typography>
      {!canDownload ? (
        <Typography variant="body2" color="warning.main">
          Missing permission document.download
        </Typography>
      ) : (
        <Button
          size="small"
          variant="outlined"
          startIcon={
            loading ? (
              <CircularProgress size={14} />
            ) : (
              <OpenInNewOutlinedIcon />
            )
          }
          disabled={loading}
          onClick={() => {
            void openDownload();
          }}
        >
          {canPreviewInline ? 'Preview' : 'Download'}
        </Button>
      )}
      {error && !denied ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
      {url && isImage ? (
        <Box
          component="img"
          src={url}
          alt={document.originalFileName}
          sx={{
            maxWidth: '100%',
            maxHeight: 320,
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
      ) : null}
      {url && isPdf ? (
        <Box
          component="iframe"
          title={document.originalFileName}
          src={url}
          sx={{
            width: '100%',
            height: 360,
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
      ) : null}
    </Stack>
  );
}
