import type { ListLeadsQuery } from './types';

export const leadsKeys = {
  all: ['leads'] as const,
  list: (query: ListLeadsQuery) => [...leadsKeys.all, 'list', query] as const,
  detail: (id: string) => [...leadsKeys.all, 'detail', id] as const,
};
