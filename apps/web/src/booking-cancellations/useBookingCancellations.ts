import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  approveBookingCancellation,
  fetchBankAccountOptions,
  fetchBookingCancellation,
  fetchBookingCancellations,
  fetchCancellableBookingOptions,
  processCancellationRefund,
  rejectBookingCancellation,
  releaseCancellationUnit,
  requestBookingCancellation,
  reviewBookingCancellation,
  submitCancellationForApproval,
} from './api';
import { bookingCancellationsKeys } from './queryKeys';
import type {
  ApproveBookingCancellationInput,
  ListBookingCancellationsQuery,
  ProcessRefundInput,
  RejectBookingCancellationInput,
  RequestBookingCancellationInput,
  ReviewBookingCancellationInput,
} from './types';

export function useBookingCancellationsList(
  query: ListBookingCancellationsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: bookingCancellationsKeys.list(query),
    queryFn: () => fetchBookingCancellations(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBookingCancellationDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: bookingCancellationsKeys.detail(id ?? ''),
    queryFn: () => fetchBookingCancellation(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useCancellableBookings(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: bookingCancellationsKeys.bookings(projectId ?? ''),
    queryFn: () => fetchCancellableBookingOptions(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useBankAccountOptions(enabled = true) {
  return useQuery({
    queryKey: bookingCancellationsKeys.banks(),
    queryFn: () => fetchBankAccountOptions(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: bookingCancellationsKeys.all });
  };
}

export function useRequestBookingCancellation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: RequestBookingCancellationInput) =>
      requestBookingCancellation(input),
    onSuccess: invalidate,
  });
}

export function useReviewBookingCancellation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (args: {
      id: string;
      input: ReviewBookingCancellationInput;
    }) => reviewBookingCancellation(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitCancellationApproval() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => submitCancellationForApproval(id),
    onSuccess: invalidate,
  });
}

export function useApproveBookingCancellation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (args: {
      id: string;
      input?: ApproveBookingCancellationInput;
    }) => approveBookingCancellation(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useRejectBookingCancellation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (args: {
      id: string;
      input: RejectBookingCancellationInput;
    }) => rejectBookingCancellation(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useProcessCancellationRefund() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (args: { id: string; input: ProcessRefundInput }) =>
      processCancellationRefund(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useReleaseCancellationUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => releaseCancellationUnit(id),
    onSuccess: invalidate,
  });
}
