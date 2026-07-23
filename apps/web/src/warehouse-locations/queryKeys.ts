import type { ListWarehouseLocationsQuery } from './types';

export const warehouseLocationsKeys = {
  all: ['warehouse-locations'] as const,
  lists: () => [...warehouseLocationsKeys.all, 'list'] as const,
  list: (query: ListWarehouseLocationsQuery) =>
    [...warehouseLocationsKeys.lists(), query] as const,
  details: () => [...warehouseLocationsKeys.all, 'detail'] as const,
  detail: (id: string) => [...warehouseLocationsKeys.details(), id] as const,
};
