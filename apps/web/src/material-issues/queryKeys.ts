import type { ListMaterialIssuesQuery } from './types';

export const materialIssuesKeys = {
  all: ['material-issues'] as const,
  lists: () => [...materialIssuesKeys.all, 'list'] as const,
  list: (query: ListMaterialIssuesQuery) =>
    [...materialIssuesKeys.lists(), query] as const,
  details: () => [...materialIssuesKeys.all, 'detail'] as const,
  detail: (id: string) => [...materialIssuesKeys.details(), id] as const,
  stock: (projectId: string, materialId: string, location: string) =>
    [
      ...materialIssuesKeys.all,
      'stock',
      projectId,
      materialId,
      location,
    ] as const,
  materials: (search: string) =>
    [...materialIssuesKeys.all, 'materials', search] as const,
  boqItems: (projectId: string, search: string) =>
    [...materialIssuesKeys.all, 'boq', projectId, search] as const,
  users: (projectId: string) =>
    [...materialIssuesKeys.all, 'users', projectId] as const,
};
