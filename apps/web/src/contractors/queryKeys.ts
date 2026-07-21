import type { ListContractorsQuery } from './types';

export const contractorsKeys = {
  all: ['contractors'] as const,
  lists: () => [...contractorsKeys.all, 'list'] as const,
  list: (query: ListContractorsQuery) =>
    [...contractorsKeys.lists(), query] as const,
  details: () => [...contractorsKeys.all, 'detail'] as const,
  detail: (id: string) => [...contractorsKeys.details(), id] as const,
  documents: (id: string) =>
    [...contractorsKeys.detail(id), 'documents'] as const,
  projects: (id: string) =>
    [...contractorsKeys.detail(id), 'projects'] as const,
  performance: (id: string) =>
    [...contractorsKeys.detail(id), 'performance'] as const,
};
