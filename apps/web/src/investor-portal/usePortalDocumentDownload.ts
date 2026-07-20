import { useCallback, useState } from 'react';
import { getDocumentDownloadUrl } from '@/api/documents';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { isDocumentObjectId } from './documentDownload';

export function usePortalDocumentDownload() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (documentId: string, rowId: string) => {
    if (!isDocumentObjectId(documentId)) {
      setError('Only S3 document references can be downloaded');
      return;
    }
    setDownloadingId(rowId);
    setError(null);
    try {
      const result = await getDocumentDownloadUrl(documentId);
      const url = result.download?.url;
      if (!url) {
        throw new Error('Download URL missing from response');
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (isForbiddenError(err)) {
        setError('Download denied (403). Requires document.download.');
      } else {
        setError(getErrorMessage(err, 'Download failed'));
      }
    } finally {
      setDownloadingId(null);
    }
  }, []);

  return { download, downloadingId, error, clearError: () => setError(null) };
}
