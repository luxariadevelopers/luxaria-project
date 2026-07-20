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

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function isObjectId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

function isUploadPath(value: string): boolean {
  return value.startsWith('uploads/') || value.startsWith('/uploads/');
}

type MediaItemProps = {
  refValue: string;
  label: string;
  canDownload: boolean;
};

function MediaItem({ refValue, label, canDownload }: MediaItemProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);

    if (isUploadPath(refValue)) {
      setUrl(resolveUploadsUrl(refValue.replace(/^\//, '')));
      return;
    }

    if (!isObjectId(refValue)) {
      setError('Unrecognized media reference');
      return;
    }

    if (!canDownload) {
      setError('Missing permission document.download');
      return;
    }

    setLoading(true);
    void getDocumentDownloadUrl(refValue)
      .then((result) => {
        if (!cancelled) {
          setUrl(result.download.url);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Failed to load media'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

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
      data-testid="grn-media-item"
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
            onError={() => {
              /* Non-image docs still open via button */
            }}
          />
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
  photos: readonly string[];
  challanDocument: string | null;
  weighbridgeDocument: string | null;
  canDownload: boolean;
};

/**
 * Receipt photos + challan / weighbridge refs.
 * Supports document ObjectIds (`document.download`) or `uploads/…` paths.
 */
export function GrnMediaGallery({
  photos,
  challanDocument,
  weighbridgeDocument,
  canDownload,
}: Props) {
  const entries: Array<{ key: string; ref: string; label: string }> = [];

  photos.forEach((photo, index) => {
    if (photo?.trim()) {
      entries.push({
        key: `photo-${index}-${photo}`,
        ref: photo.trim(),
        label: `Photo ${index + 1}`,
      });
    }
  });
  if (challanDocument?.trim()) {
    entries.push({
      key: `challan-${challanDocument}`,
      ref: challanDocument.trim(),
      label: 'Challan',
    });
  }
  if (weighbridgeDocument?.trim()) {
    entries.push({
      key: `weighbridge-${weighbridgeDocument}`,
      ref: weighbridgeDocument.trim(),
      label: 'Weighbridge',
    });
  }

  if (entries.length === 0) {
    return (
      <Typography color="text.secondary" data-testid="grn-media-empty">
        No receipt media attached.
      </Typography>
    );
  }

  return (
    <ImageList cols={2} gap={12} data-testid="grn-media-gallery">
      {entries.map((entry) => (
        <MediaItem
          key={entry.key}
          refValue={entry.ref}
          label={entry.label}
          canDownload={canDownload}
        />
      ))}
    </ImageList>
  );
}
