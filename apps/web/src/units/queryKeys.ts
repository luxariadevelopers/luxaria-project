import type { ListUnitsQuery } from './types';

export const unitsKeys = {
  all: ['units'] as const,
  list: (query: ListUnitsQuery) =>
    [...unitsKeys.all, 'list', query] as const,
  detail: (id: string) => [...unitsKeys.all, 'detail', id] as const,
  bookings: (unitId: string) =>
    [...unitsKeys.all, 'bookings', unitId] as const,
};
