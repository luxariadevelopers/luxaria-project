import type { ListWorkOrdersQuery } from './types';

export const workOrdersKeys = {
  all: ['work-orders'] as const,
  lists: () => [...workOrdersKeys.all, 'list'] as const,
  list: (query: ListWorkOrdersQuery) =>
    [...workOrdersKeys.lists(), query] as const,
  details: () => [...workOrdersKeys.all, 'detail'] as const,
  detail: (id: string) => [...workOrdersKeys.details(), id] as const,
  amendments: (workOrderId: string) =>
    [...workOrdersKeys.all, 'amendments', workOrderId] as const,
};
