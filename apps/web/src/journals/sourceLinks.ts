import { sourceModuleLabel } from './labels';
import type { PublicJournalEntry } from './types';

export type JournalSourceLink = {
  /** Short label for the source module. */
  label: string;
  /** Detail line (entity type · id). */
  detail: string;
  /**
   * In-app path when a web route exists for this source.
   * Most accounting source modules are not yet portalled — then `href` is null
   * and the UI shows the identifiers for tracing.
   */
  href: string | null;
};

/**
 * Resolve a displayable source trace for a journal row.
 * Nest stores free-form `sourceModule` / `sourceEntityType` / `sourceEntityId`.
 */
export function resolveJournalSourceLink(
  row: Pick<
    PublicJournalEntry,
    | 'sourceModule'
    | 'sourceEntityType'
    | 'sourceEntityId'
    | 'reversalOf'
  >,
): JournalSourceLink {
  const module = row.sourceModule?.trim() || null;
  const entityType = row.sourceEntityType?.trim() || null;
  const entityId = row.sourceEntityId?.trim() || row.reversalOf || null;

  const label = sourceModuleLabel(module);
  const parts = [entityType, entityId].filter(Boolean);
  const detail = parts.length > 0 ? parts.join(' · ') : 'No source entity';

  // Reversal journals / links to original journal detail.
  if (
    (module === 'journal' &&
      (entityType === 'journal_reversal' || row.reversalOf) &&
      entityId) ||
    (row.reversalOf && entityId)
  ) {
    return {
      label,
      detail,
      href: `/accounting/journals/${entityId}`,
    };
  }

  // Manual journals have no external source document.
  if (module === 'manual' || module == null) {
    return {
      label: module ? label : 'Manual',
      detail: entityId ? detail : 'Manual journal',
      href: null,
    };
  }

  return { label, detail, href: null };
}
