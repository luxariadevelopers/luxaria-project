import type { ListMaterialsQuery, ListStockLedgerQuery } from './types';

export const materialsKeys = {
  all: ['materials'] as const,
  list: (query: ListMaterialsQuery) =>
    [...materialsKeys.all, 'list', query] as const,
  detail: (id: string) => [...materialsKeys.all, 'detail', id] as const,
  units: () => [...materialsKeys.all, 'units'] as const,
  ledgerOptions: () => [...materialsKeys.all, 'ledger-options'] as const,
  stockBalance: (
    materialId: string,
    projectId: string,
    location?: string,
  ) =>
    [...materialsKeys.all, 'stock-balance', materialId, projectId, location ?? ''] as const,
  usage: (materialId: string, query: ListStockLedgerQuery) =>
    [...materialsKeys.all, 'usage', materialId, query] as const,
};
