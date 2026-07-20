import { useEffect, useRef, useState } from 'react';
import { getErrorMessage, isForbiddenError, toAppError } from '@/api/errors';
import {
  openPdfUrl,
  popupBlockedMessage,
  printPdfUrl,
} from './openPdfUrl';
import {
  PdfActionError,
  resolvePdfSource,
  resolvePdfSourceFresh,
} from './resolvePdf';
import type { PdfActionSource, PdfResolveResult } from './types';

export type PdfActionMode = 'preview' | 'download' | 'print' | 'regenerate';

type Args = {
  source: PdfActionSource;
  /** Parent already evaluated entity view permission. */
  canViewEntity: boolean;
  canDocumentDownload: boolean;
  canExportReport: boolean;
};

export function usePdfActions({
  source,
  canViewEntity,
  canDocumentDownload,
  canExportReport,
}: Args) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [preview, setPreview] = useState<PdfResolveResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const revokeRef = useRef<(() => void) | null>(null);

  const clearPreview = () => {
    revokeRef.current?.();
    revokeRef.current = null;
    setPreview(null);
    setPreviewOpen(false);
  };

  useEffect(() => () => {
    revokeRef.current?.();
  }, []);

  const permissionDeniedReason = (): string | null => {
    if (!canViewEntity) {
      return 'Missing entity view permission for this document.';
    }
    if (source.kind === 'unavailable') {
      return null;
    }
    if (source.kind === 'report-blob') {
      return canExportReport ? null : 'Missing permission report.export';
    }
    if (
      (source.kind === 'document' ||
        source.kind === 'generate-document' ||
        source.kind === 'generate-path') &&
      !canDocumentDownload
    ) {
      return 'Missing permission document.download';
    }
    return null;
  };

  const run = async (mode: PdfActionMode) => {
    setError(null);
    const denied = permissionDeniedReason();
    if (denied) {
      setError(new PdfActionError('unavailable', denied));
      return;
    }
    if (source.kind === 'unavailable') {
      setError(new PdfActionError('unavailable', source.reason));
      return;
    }

    const showDialog = mode === 'preview' || mode === 'regenerate';
    if (showDialog) {
      setPreviewOpen(true);
    }

    setLoading(true);
    try {
      const resolved =
        mode === 'regenerate'
          ? await resolvePdfSourceFresh(source)
          : await resolvePdfSource(source);

      if (resolved.mode === 'blob-url') {
        revokeRef.current?.();
        revokeRef.current = resolved.revoke;
      }

      if (showDialog) {
        setPreview(resolved);
        return;
      }

      if (mode === 'download') {
        const openResult = openPdfUrl(resolved.url);
        if (!openResult.ok) {
          setError(new PdfActionError('unavailable', popupBlockedMessage()));
          return;
        }
        if (resolved.mode === 'blob-url') {
          // Give the browser a moment to start the download before revoke.
          window.setTimeout(() => {
            resolved.revoke();
          }, 60_000);
        }
        return;
      }

      // print
      const printResult = printPdfUrl(resolved.url);
      if (!printResult.ok) {
        setError(new PdfActionError('unavailable', popupBlockedMessage()));
        setPreview(resolved);
        setPreviewOpen(true);
        return;
      }
      if (resolved.mode === 'blob-url') {
        window.setTimeout(() => {
          resolved.revoke();
        }, 60_000);
      }
    } catch (err) {
      setError(err);
      if (showDialog) {
        setPreviewOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const canOfferRegenerate =
    source.kind === 'generate-document' || source.kind === 'generate-path';

  const unavailableReason =
    source.kind === 'unavailable' ? source.reason : permissionDeniedReason();

  return {
    loading,
    error,
    preview,
    previewOpen,
    setPreviewOpen: (open: boolean) => {
      if (!open) clearPreview();
      else setPreviewOpen(true);
    },
    clearPreview,
    run,
    canOfferRegenerate,
    unavailableReason,
    label: source.label,
    isForbidden: error ? isForbiddenError(error) : false,
    errorMessage: error
      ? error instanceof PdfActionError
        ? error.message
        : getErrorMessage(error, 'PDF action failed')
      : null,
    appError: error ? toAppError(error, 'PDF action failed') : null,
  };
}
