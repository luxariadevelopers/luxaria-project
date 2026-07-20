import type { ListPurchaseRequestsQuery } from './types';

export const purchaseRequestsKeys = {
  all: ['purchase-requests'] as const,
  list: (query: ListPurchaseRequestsQuery) =>
    [...purchaseRequestsKeys.all, 'list', query] as const,
  detail: (id: string) =>
    [...purchaseRequestsKeys.all, 'detail', id] as const,
  materials: (search: string) =>
    [...purchaseRequestsKeys.all, 'materials', search] as const,
  material: (id: string) =>
    [...purchaseRequestsKeys.all, 'material', id] as const,
  stockBalance: (projectId: string, materialId: string) =>
    [
      ...purchaseRequestsKeys.all,
      'stock-balance',
      projectId,
      materialId,
    ] as const,
  boqItems: (projectId: string, search: string) =>
    [...purchaseRequestsKeys.all, 'boq-items', projectId, search] as const,
};
