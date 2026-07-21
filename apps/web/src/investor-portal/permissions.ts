/**
 * Brief UI permission aliases for the investor portal.
 *
 * Nest catalog: `investor_portal.view` (self-service read) and
 * `investor_portal.manage` (staff publish reports / profit allocations).
 * There are no separate `investor.document.*` permission codes.
 * Downloading S3-backed files still flows through
 * `GET /documents/:id/download-url` and needs `document.download`
 * in addition when `documentPath` is a Mongo ObjectId.
 *
 * Never call staff `GET /investors/:id/documents` from portal UI.
 */
export const INVESTOR_PORTAL_VIEW = 'investor_portal.view' as const;
export const INVESTOR_PORTAL_MANAGE = 'investor_portal.manage' as const;
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

/** Staff manage: publish reports, record profit, mark distributed. */
export function canManageInvestorPortal(
  hasPermission: (code: string) => boolean,
): boolean {
  return hasPermission(INVESTOR_PORTAL_MANAGE);
}
