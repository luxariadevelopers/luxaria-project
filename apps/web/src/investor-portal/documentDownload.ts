const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export function isDocumentObjectId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

export function isUploadPath(value: string): boolean {
  return value.startsWith('uploads/') || value.startsWith('/uploads/');
}

export type DocumentDownloadResolution = {
  canDownload: boolean;
  reason?: string;
};

/**
 * Portal downloads only use real endpoints:
 * - Mongo ObjectId → `GET /documents/:id/download-url` (`document.download`)
 * - Local `uploads/…` paths have no investor-portal download route
 */
export function resolvePortalDocumentDownload(
  documentPath: string | null | undefined,
  canDownloadS3Documents: boolean,
): DocumentDownloadResolution {
  const ref = documentPath?.trim();
  if (!ref) {
    return { canDownload: false, reason: 'No attachment' };
  }
  if (isUploadPath(ref)) {
    return {
      canDownload: false,
      reason: 'Local upload paths are not exposed on the investor portal',
    };
  }
  if (isDocumentObjectId(ref)) {
    if (!canDownloadS3Documents) {
      return {
        canDownload: false,
        reason: 'Missing investor_portal.view + document.download',
      };
    }
    return { canDownload: true };
  }
  return { canDownload: false, reason: 'Unrecognized document reference' };
}

export function resolveReceiptDownload(
  hasDocument: boolean,
  canDownloadS3Documents: boolean,
): DocumentDownloadResolution {
  if (!hasDocument) {
    return { canDownload: false, reason: 'No receipt document on file' };
  }
  // Portal detail only exposes hasDocument; receipt bytes are local uploads today.
  if (!canDownloadS3Documents) {
    return {
      canDownload: false,
      reason:
        'Receipt PDFs are not downloadable via the portal API (no staff receipt endpoint is called)',
    };
  }
  return {
    canDownload: false,
    reason:
      'Receipt attachments are stored as local uploads; no portal download endpoint exists',
  };
}
