import type { ListBookingsQuery } from './types';

export const bookingsKeys = {
  all: ['bookings'] as const,
  list: (query: ListBookingsQuery) =>
    [...bookingsKeys.all, 'list', query] as const,
  detail: (id: string) => [...bookingsKeys.all, 'detail', id] as const,
};
