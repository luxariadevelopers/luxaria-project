import type { ListDirectorsQuery } from './types';

export const directorsKeys = {
  all: ['directors'] as const,
  list: (query: ListDirectorsQuery) =>
    [...directorsKeys.all, 'list', query] as const,
  detail: (id: string) => [...directorsKeys.all, 'detail', id] as const,
  documents: (id: string) => [...directorsKeys.all, 'documents', id] as const,
  shareholding: (companyId?: string | null) =>
    [...directorsKeys.all, 'shareholding', companyId ?? 'default'] as const,
};
