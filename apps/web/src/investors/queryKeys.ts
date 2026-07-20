import type { ListInvestorsQuery } from './types';

export const investorsKeys = {
  all: ['investors'] as const,
  list: (query: ListInvestorsQuery) =>
    [...investorsKeys.all, 'list', query] as const,
  detail: (id: string) => [...investorsKeys.all, 'detail', id] as const,
  documents: (id: string) => [...investorsKeys.all, 'documents', id] as const,
};
