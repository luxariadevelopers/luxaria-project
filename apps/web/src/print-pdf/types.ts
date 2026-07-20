import type { PermissionCode } from '@/navigation/permissionCatalog';

/** How the client obtains a printable/downloadable PDF. */
export type PdfSourceKind =
  | 'document'
  | 'generate-document'
  | 'generate-path'
  | 'report-blob'
  | 'unavailable';

/**
 * Descriptor passed to `DocumentActionMenu`.
 * Callers build these via `sources/*` helpers — do not invent API paths.
 */
export type PdfActionSource =
  | {
      kind: 'document';
      label: string;
      documentId: string;
      /** Entity view permission already evaluated by parent (`canViewEntity`). */
      requiresDocumentDownload?: boolean;
    }
  | {
      kind: 'generate-document';
      label: string;
      /** Existing document id when PDF already stored. */
      documentId: string | null;
      /** Backend statuses that allow generate/regenerate (exact API values). */
      allowedStatuses: readonly string[];
      status: string;
      generate: () => Promise<{ documentId: string }>;
      requiresDocumentDownload?: boolean;
    }
  | {
      kind: 'generate-path';
      label: string;
      /** Existing relative path (`uploads/…`) when PDF already stored. */
      downloadPath: string | null;
      allowedStatuses?: readonly string[];
      status?: string;
      generate: () => Promise<{ downloadPath: string }>;
      requiresDocumentDownload?: boolean;
    }
  | {
      kind: 'report-blob';
      label: string;
      /** Permission checked in addition to entity view (usually `report.export`). */
      exportPermission: PermissionCode;
      fetch: () => Promise<{ blob: Blob; filename: string }>;
    }
  | {
      kind: 'unavailable';
      label: string;
      reason: string;
    };

export type PdfResolveResult =
  | { mode: 'url'; url: string; filename?: string }
  | { mode: 'blob-url'; url: string; filename: string; revoke: () => void };

export type OpenUrlResult =
  | { ok: true; window: Window }
  | { ok: false; reason: 'popup_blocked' };

export type PdfActionErrorKind =
  | 'permission'
  | 'unsupported_status'
  | 'unavailable'
  | 'popup_blocked'
  | 'api'
  | 'missing_pdf';
