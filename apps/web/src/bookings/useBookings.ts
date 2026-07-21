import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveDiscount,
  cancelBooking,
  createBooking,
  fetchBooking,
  fetchBookings,
  rejectDiscount,
  transitionBooking,
  updateBooking,
} from './api';
import { bookingsKeys } from './queryKeys';
import type {
  ApproveBookingDiscountInput,
  CancelBookingInput,
  CreateBookingInput,
  ListBookingsQuery,
  RejectBookingDiscountInput,
  TransitionBookingInput,
  UpdateBookingInput,
} from './types';

function useInvalidateBookings() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: bookingsKeys.all });
  };
}

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

export function useCreateBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBookingInput }) =>
      updateBooking(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useTransitionBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: TransitionBookingInput;
    }) => transitionBooking(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useApproveBookingDiscount() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({
      id,
      input = {},
    }: {
      id: string;
      input?: ApproveBookingDiscountInput;
    }) => approveDiscount(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useRejectBookingDiscount() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: RejectBookingDiscountInput;
    }) => rejectDiscount(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useCancelBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({
      id,
      input = {},
    }: {
      id: string;
      input?: CancelBookingInput;
    }) => cancelBooking(id, input),
    onSuccess: () => invalidate(),
  });
}
