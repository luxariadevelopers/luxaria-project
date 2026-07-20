import type { ListBookingCancellationsQuery } from './types';

export const bookingCancellationsKeys = {
  all: ['booking-cancellations'] as const,
  lists: () => [...bookingCancellationsKeys.all, 'list'] as const,
  list: (query: ListBookingCancellationsQuery) =>
    [...bookingCancellationsKeys.lists(), query] as const,
  details: () => [...bookingCancellationsKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingCancellationsKeys.details(), id] as const,
  bookings: (projectId: string) =>
    [...bookingCancellationsKeys.all, 'bookings', projectId] as const,
  banks: () => [...bookingCancellationsKeys.all, 'banks'] as const,
};
