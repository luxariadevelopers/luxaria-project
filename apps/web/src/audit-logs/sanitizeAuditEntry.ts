import type { PublicAuditLogEntry } from '@luxaria/shared-types';
import { maskSensitiveData } from './maskSensitiveData';

function asRecord(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (value == null) return null;
  return maskSensitiveData(value);
}

/**
 * Defensive sanitize for UI display. Backend already masks on write;
 * we never reverse masked scalars and re-apply the Nest key allow-list.
 */
export function sanitizeAuditEntry(
  entry: PublicAuditLogEntry,
): PublicAuditLogEntry {
  return {
    ...entry,
    beforeData: asRecord(entry.beforeData),
    afterData: asRecord(entry.afterData),
  };
}

export function sanitizeAuditEntries(
  entries: readonly PublicAuditLogEntry[],
): PublicAuditLogEntry[] {
  return entries.map(sanitizeAuditEntry);
}
