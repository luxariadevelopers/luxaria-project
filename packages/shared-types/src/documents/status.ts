/**
 * Mirrors `apps/backend/src/modules/documents/schemas/document.schema.ts`.
 */

export const DocumentStatus = {
  PendingUpload: 'pending_upload',
  Active: 'active',
  Replaced: 'replaced',
  Archived: 'archived',
} as const;

export type DocumentStatus =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const MalwareScanStatus = {
  Pending: 'pending',
  Clean: 'clean',
  Infected: 'infected',
  Skipped: 'skipped',
  Error: 'error',
} as const;

export type MalwareScanStatus =
  (typeof MalwareScanStatus)[keyof typeof MalwareScanStatus];

/** Only confirmed (active) documents should be linked to business records. */
export function isConfirmedDocumentStatus(status: string): boolean {
  return status === DocumentStatus.Active;
}
