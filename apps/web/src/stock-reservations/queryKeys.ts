import type { ListStockReservationsQuery } from './types';

export const stockReservationsKeys = {
  all: ['stock-reservations'] as const,
  lists: () => [...stockReservationsKeys.all, 'list'] as const,
  list: (query: ListStockReservationsQuery) =>
    [...stockReservationsKeys.lists(), query] as const,
  details: () => [...stockReservationsKeys.all, 'detail'] as const,
  detail: (id: string) => [...stockReservationsKeys.details(), id] as const,
  available: (query: {
    projectId: string;
    materialId: string;
    location?: string;
  }) => [...stockReservationsKeys.all, 'available', query] as const,
};
