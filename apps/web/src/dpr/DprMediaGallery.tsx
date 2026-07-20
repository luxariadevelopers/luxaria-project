import { useEffect, useState } from 'react';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import {
  Box,
  Button,
  CircularProgress,
  ImageList,
  ImageListItem,
  Stack,
  Typography,
} from '@mui/material';
import { getDocumentDownloadUrl } from '@/api/documents';
import { getErrorMessage } from '@/api/errors';
import { resolveUploadsUrl } from '@/print-pdf/resolveUploadsUrl';
import {
  buildDprMediaEntries,
  describeMediaReference,
  isDocumentObjectId,
  isUploadPath,
} from './mediaHelpers';

type MediaItemProps = {
  refValue: string;
  label: string;
  kind: 'photo' | 'video';
  canDownload: boolean;
};

function MediaItem({ refValue, label, kind, canDownload }: MediaItemProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);

    const described = describeMediaReference(refValue, canDownload);
    if (!described.canResolve) {
      setError(described.reason ?? 'Cannot load media');
      return;
    }

    if (isUploadPath(refValue)) {
      setUrl(resolveUploadsUrl(refValue.replace(/^\//, '')));
      return;
    }

    if (isDocumentObjectId(refValue)) {
      setLoading(true);
      void getDocumentDownloadUrl(refValue)
        .then((result) => {
          if (!cancelled) setUrl(result.download.url);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(getErrorMessage(err, 'Failed to load media'));
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [refValue, canDownload]);

  return (
    <ImageListItem
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        p: 1,
        bgcolor: 'background.paper',
      }}
      data-testid="dpr-media-item"
    >
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={22} />
        </Box>
      ) : null}
      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}
      {url ? (
        <Stack spacing={1}>
          {kind === 'photo' ? (
            <Box
              component="img"
              src={url}
              alt={label}
              sx={{
                width: '100%',
                maxHeight: 180,
                objectFit: 'contain',
                bgcolor: 'action.hover',
              }}
            />
          ) : (
            <Box
              component="video"
              src={url}
              controls
              sx={{ width: '100%', maxHeight: 220, bgcolor: 'action.hover' }}
            />
          )}
          <Button
            size="small"
            variant="text"
            startIcon={<OpenInNewOutlinedIcon />}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open
          </Button>
        </Stack>
      ) : null}
    </ImageListItem>
  );
}

type Props = {
  photoDocumentIds: readonly string[];
  videoDocumentIds: readonly string[];
  canDownload: boolean;
};

export function DprMediaGallery({
  photoDocumentIds,
  videoDocumentIds,
  canDownload,
}: Props) {
  const entries = buildDprMediaEntries({ photoDocumentIds, videoDocumentIds });

  if (entries.length === 0) {
    return (
      <Typography color="text.secondary" data-testid="dpr-media-empty">
        No site photos or videos attached.
      </Typography>
    );
  }

  return (
    <ImageList cols={2} gap={12} data-testid="dpr-media-gallery">
      {entries.map((entry) => (
        <MediaItem
          key={entry.key}
          refValue={entry.ref}
          label={entry.label}
          kind={entry.kind}
          canDownload={canDownload}
        />
      ))}
    </ImageList>
  );
}
