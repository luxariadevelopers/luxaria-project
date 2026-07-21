import type { ListRfqsQuery } from './types';

export const rfqKeys = {
  all: ['rfqs'] as const,
  list: (query: ListRfqsQuery) => [...rfqKeys.all, 'list', query] as const,
  detail: (id: string) => [...rfqKeys.all, 'detail', id] as const,
  responses: (id: string) => [...rfqKeys.all, 'responses', id] as const,
};
