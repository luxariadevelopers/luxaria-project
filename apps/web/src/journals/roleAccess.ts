export type JournalCapabilities = {
  canView: boolean;
  /**
   * Nest: create, update draft/pending, submit, cancel.
   * Catalog has no `journal.submit` / `journal.cancel` — both use `journal.create`.
   */
  canCreate: boolean;
  canPost: boolean;
  canReverse: boolean;
  /** Alias of `canCreate` for cancel action clarity. */
  canCancel: boolean;
};

export function resolveJournalCapabilities(
  hasPermission: (code: string) => boolean,
): JournalCapabilities {
  const canCreate = hasPermission('journal.create');
  return {
    canView: hasPermission('journal.view'),
    canCreate,
    canPost: hasPermission('journal.post'),
    canReverse: hasPermission('journal.reverse'),
    canCancel: canCreate,
  };
}
