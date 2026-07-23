export type JournalCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canPost: boolean;
  canReverse: boolean;
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
