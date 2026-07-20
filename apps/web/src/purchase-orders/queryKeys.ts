import type { ListPurchaseOrdersQuery } from './types';

export const purchaseOrdersKeys = {
  all: ['purchase-orders'] as const,
  list: (query: ListPurchaseOrdersQuery) =>
    [...purchaseOrdersKeys.all, 'list', query] as const,
  detail: (id: string) => [...purchaseOrdersKeys.all, 'detail', id] as const,
  balance: (id: string) =>
    [...purchaseOrdersKeys.all, 'balance', id] as const,
};
