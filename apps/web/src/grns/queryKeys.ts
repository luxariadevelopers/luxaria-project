import type { ListGoodsReceiptsQuery } from './types';

export const grnsKeys = {
  all: ['goods-receipts'] as const,
  list: (query: ListGoodsReceiptsQuery) =>
    [...grnsKeys.all, 'list', query] as const,
  detail: (id: string) => [...grnsKeys.all, 'detail', id] as const,
  purchaseOrder: (id: string) =>
    [...grnsKeys.all, 'purchase-order', id] as const,
};
