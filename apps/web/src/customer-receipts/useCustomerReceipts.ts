import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelCustomerReceipt,
  createCustomerReceipt,
  fetchAllocatableDemands,
  fetchBankAccountOptions,
  fetchBookingOptions,
  fetchCustomerReceipts,
  postCustomerReceipt,
  regenerateCustomerReceiptPdf,
} from './api';
import { customerReceiptsKeys } from './queryKeys';
import type {
  CancelCustomerReceiptInput,
  CreateCustomerReceiptInput,
  ListCustomerReceiptsQuery,
} from './types';

export function useCustomerReceiptsList(
  query: ListCustomerReceiptsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: customerReceiptsKeys.list(query),
    queryFn: () => fetchCustomerReceipts(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBankAccountOptions(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: [...customerReceiptsKeys.bankAccounts, projectId ?? ''],
    queryFn: () => fetchBankAccountOptions(projectId),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useBookingOptions(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: customerReceiptsKeys.bookings(projectId ?? null),
    queryFn: () => fetchBookingOptions(projectId),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useAllocatableDemands(
  bookingId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: customerReceiptsKeys.demands(bookingId ?? ''),
    queryFn: () => fetchAllocatableDemands(bookingId!),
    enabled: Boolean(bookingId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidateReceipts() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: customerReceiptsKeys.all });
  };
}

export function useCreateCustomerReceipt() {
  const invalidate = useInvalidateReceipts();
  return useMutation({
    mutationFn: (input: CreateCustomerReceiptInput) =>
      createCustomerReceipt(input),
    onSuccess: invalidate,
  });
}

export function usePostCustomerReceipt() {
  const invalidate = useInvalidateReceipts();
  return useMutation({
    mutationFn: (id: string) => postCustomerReceipt(id),
    onSuccess: invalidate,
  });
}

export function useCancelCustomerReceipt() {
  const invalidate = useInvalidateReceipts();
  return useMutation({
    mutationFn: (args: { id: string; input?: CancelCustomerReceiptInput }) =>
      cancelCustomerReceipt(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useRegenerateCustomerReceiptPdf() {
  const invalidate = useInvalidateReceipts();
  return useMutation({
    mutationFn: (id: string) => regenerateCustomerReceiptPdf(id),
    onSuccess: invalidate,
  });
}
