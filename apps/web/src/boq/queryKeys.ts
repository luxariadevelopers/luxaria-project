export const boqKeys = {
  all: ['boq'] as const,
  hierarchy: (projectId: string) =>
    [...boqKeys.all, 'hierarchy', projectId] as const,
  totals: (projectId: string) =>
    [...boqKeys.all, 'totals', projectId] as const,
  item: (id: string) => [...boqKeys.all, 'item', id] as const,
  versions: (projectId: string) =>
    [...boqKeys.all, 'versions', projectId] as const,
  activeVersion: (projectId: string) =>
    [...boqKeys.all, 'active-version', projectId] as const,
  version: (id: string) => [...boqKeys.all, 'version', id] as const,
  compare: (
    projectId: string,
    fromVersionId: string,
    toVersionId: string,
  ) =>
    [
      ...boqKeys.all,
      'compare',
      projectId,
      fromVersionId,
      toVersionId,
    ] as const,
};
