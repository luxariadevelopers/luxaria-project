import type { ListAccountingPeriodsQuery } from './types';

export const periodCloseKeys = {
  all: ['period-close'] as const,
  lists: () => [...periodCloseKeys.all, 'list'] as const,
  list: (query: ListAccountingPeriodsQuery) =>
    [...periodCloseKeys.lists(), query] as const,
  details: () => [...periodCloseKeys.all, 'detail'] as const,
  detail: (id: string) => [...periodCloseKeys.details(), id] as const,
  checklist: (id: string) =>
    [...periodCloseKeys.all, 'checklist', id] as const,
  reopenRequests: (id: string) =>
    [...periodCloseKeys.all, 'reopen-requests', id] as const,
};
