import { useCallback, useRef, useState } from 'react';
import { getDocumentDownloadUrl } from '@/api/documents';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import {
  canRequestDownloadForStatus,
  isDownloadUrlExpired,
  type CachedDownloadUrl,
} from './downloadUrlExpiry';

type Options = {
  documentId: string;
  status: string;
  canDownload: boolean;
};

/**
 * Fetch short-lived private GET URLs. Refreshes when expired.
 * Never caches or returns S3 object keys.
 */
export function usePresignedDownload({
  documentId,
  status,
  canDownload,
}: Options) {
  const cacheRef = useRef<CachedDownloadUrl | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const clear = useCallback(() => {
    cacheRef.current = null;
    setUrl(null);
    setError(null);
    setDenied(false);
  }, []);

  const ensureUrl = useCallback(async (): Promise<string | null> => {
    if (!canDownload) {
      setDenied(true);
      setError('Missing permission document.download');
      return null;
    }
    if (!canRequestDownloadForStatus(status)) {
      setError(
        'Download is only available for active or replaced (historical) documents',
      );
      return null;
    }

    const cached = cacheRef.current;
    if (cached && !isDownloadUrlExpired(cached)) {
      setUrl(cached.url);
      return cached.url;
    }

    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const result = await getDocumentDownloadUrl(documentId);
      const next: CachedDownloadUrl = {
        url: result.download.url,
        fetchedAtMs: Date.now(),
        expiresInSeconds: Number(result.download.expiresIn) || 0,
      };
      cacheRef.current = next;
      setUrl(next.url);
      return next.url;
    } catch (err) {
      if (isForbiddenError(err)) {
        setDenied(true);
      }
      setError(getErrorMessage(err, 'Failed to get download URL'));
      cacheRef.current = null;
      setUrl(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [canDownload, documentId, status]);

  return {
    url,
    loading,
    error,
    denied,
    ensureUrl,
    clear,
    /** Test/helper: current cache (may be expired). */
    getCache: () => cacheRef.current,
  };
}
