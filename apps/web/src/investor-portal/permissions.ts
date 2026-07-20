/**
 * Brief UI permission aliases for the investor portal.
 *
 * Nest catalog has `investor_portal.view` only — there are no separate
 * `investor.document.*` permission codes. Listing portal documents/statements
 * requires `investor_portal.view`. Downloading S3-backed files still flows
 * through `GET /documents/:id/download-url` and needs `document.download`
 * in addition when `documentPath` is a Mongo ObjectId.
 *
 * Never call staff `GET /investors/:id/documents` from portal UI.
 */
export const INVESTOR_PORTAL_VIEW = 'investor_portal.view' as const;
export const DOCUMENT_DOWNLOAD = 'document.download' as const;

/** Alias: investor.document.view → investor_portal.view */
export function canViewInvestorDocuments(
  hasPermission: (code: string) => boolean,
): boolean {
  return hasPermission(INVESTOR_PORTAL_VIEW);
}

/** Alias: investor.document.download → investor_portal.view + document.download */
export function canDownloadInvestorDocuments(
  hasPermission: (code: string) => boolean,
): boolean {
  return (
    hasPermission(INVESTOR_PORTAL_VIEW) && hasPermission(DOCUMENT_DOWNLOAD)
  );
}
