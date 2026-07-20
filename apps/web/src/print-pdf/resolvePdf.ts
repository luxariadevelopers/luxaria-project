import { getDocumentDownloadUrl } from '@/api/documents';
import { resolveUploadsUrl } from './resolveUploadsUrl';
import type { PdfActionSource, PdfResolveResult } from './types';

export class PdfActionError extends Error {
  readonly kind:
    | 'unsupported_status'
    | 'unavailable'
    | 'missing_pdf'
    | 'api';

  constructor(
    kind: PdfActionError['kind'],
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'PdfActionError';
    this.kind = kind;
  }
}

function assertStatusAllowed(
  status: string | undefined,
  allowed: readonly string[] | undefined,
): void {
  if (!allowed || allowed.length === 0) return;
  if (!status || !allowed.includes(status)) {
    throw new PdfActionError(
      'unsupported_status',
      `PDF is not available for status “${status ?? 'unknown'}”. Allowed: ${allowed.join(', ')}.`,
    );
  }
}

async function resolveDocumentId(documentId: string): Promise<PdfResolveResult> {
  // Backend enforces active/replaced + document.download on this route.
  const result = await getDocumentDownloadUrl(documentId);
  return {
    mode: 'url',
    url: result.download.url,
  };
}

/**
 * Resolve a `PdfActionSource` to a browser-openable URL (presigned or blob).
 */
export async function resolvePdfSource(
  source: PdfActionSource,
): Promise<PdfResolveResult> {
  switch (source.kind) {
    case 'unavailable':
      throw new PdfActionError('unavailable', source.reason);

    case 'document':
      return resolveDocumentId(source.documentId);

    case 'generate-document': {
      assertStatusAllowed(source.status, source.allowedStatuses);
      let documentId = source.documentId;
      if (!documentId) {
        const generated = await source.generate();
        documentId = generated.documentId;
      }
      if (!documentId) {
        throw new PdfActionError(
          'missing_pdf',
          'No PDF document id is available for this record.',
        );
      }
      return resolveDocumentId(documentId);
    }

    case 'generate-path': {
      assertStatusAllowed(source.status, source.allowedStatuses);
      let downloadPath = source.downloadPath;
      if (!downloadPath) {
        const generated = await source.generate();
        downloadPath = generated.downloadPath;
      }
      if (!downloadPath) {
        throw new PdfActionError(
          'missing_pdf',
          'No PDF path is available for this record.',
        );
      }
      return {
        mode: 'url',
        url: resolveUploadsUrl(downloadPath),
        filename: downloadPath.split('/').pop(),
      };
    }

    case 'report-blob': {
      const { blob, filename } = await source.fetch();
      const url = URL.createObjectURL(blob);
      return {
        mode: 'blob-url',
        url,
        filename,
        revoke: () => {
          URL.revokeObjectURL(url);
        },
      };
    }

    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

/** Force regenerate even when a path/document id already exists. */
export async function resolvePdfSourceFresh(
  source: PdfActionSource,
): Promise<PdfResolveResult> {
  if (source.kind === 'generate-document') {
    assertStatusAllowed(source.status, source.allowedStatuses);
    const generated = await source.generate();
    return resolveDocumentId(generated.documentId);
  }
  if (source.kind === 'generate-path') {
    assertStatusAllowed(source.status, source.allowedStatuses);
    const generated = await source.generate();
    return {
      mode: 'url',
      url: resolveUploadsUrl(generated.downloadPath),
      filename: generated.downloadPath.split('/').pop(),
    };
  }
  return resolvePdfSource(source);
}
