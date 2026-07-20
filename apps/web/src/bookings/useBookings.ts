import { useQuery } from '@tanstack/react-query';
import { fetchBooking, fetchBookings } from './api';
import { bookingsKeys } from './queryKeys';
import type { ListBookingsQuery } from './types';

export function useBookingsList(query: ListBookingsQuery, enabled = true) {
  return useQuery({
    queryKey: bookingsKeys.list(query),
    queryFn: () => fetchBookings(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBookingDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: bookingsKeys.detail(id ?? ''),
    queryFn: () => fetchBooking(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}
