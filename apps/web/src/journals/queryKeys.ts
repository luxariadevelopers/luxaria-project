import type { ListJournalsQuery } from './types';

export const journalsKeys = {
  all: ['journals'] as const,
  list: (query: ListJournalsQuery) =>
    [...journalsKeys.all, 'list', query] as const,
  detail: (id: string) => [...journalsKeys.all, 'detail', id] as const,
};
