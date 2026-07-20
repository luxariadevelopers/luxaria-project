import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  activateCustomer,
  createCustomer,
  deactivateCustomer,
  fetchCustomer,
  fetchCustomerBookings,
  fetchCustomerDocuments,
  fetchCustomerLedger,
  fetchCustomerReceipts,
  fetchCustomers,
  updateCustomer,
  uploadCustomerDocument,
  verifyCustomerKyc,
} from './api';
import { customersKeys } from './queryKeys';
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
  VerifyKycInput,
} from './types';

export function useCustomersList(
  query: ListCustomersQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: customersKeys.list(query),
    queryFn: () => fetchCustomers(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCustomerDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: customersKeys.detail(id ?? ''),
    queryFn: () => fetchCustomer(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCustomerDocuments(
  customerId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: customersKeys.documents(customerId ?? ''),
    queryFn: () => fetchCustomerDocuments(customerId!),
    enabled: Boolean(customerId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCustomerBookings(
  customerId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: customersKeys.bookings(customerId ?? ''),
    queryFn: () => fetchCustomerBookings(customerId!),
    enabled: Boolean(customerId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCustomerReceipts(
  customerId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: customersKeys.receipts(customerId ?? ''),
    queryFn: () => fetchCustomerReceipts(customerId!),
    enabled: Boolean(customerId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCustomerLedger(
  customerId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: customersKeys.ledger(customerId ?? ''),
    queryFn: () => fetchCustomerLedger(customerId!),
    enabled: Boolean(customerId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => createCustomer(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: customersKeys.all });
    },
  });
}

export function useUpdateCustomer(customerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateCustomerInput }) =>
      updateCustomer(args.id, args.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: customersKeys.all });
      void qc.invalidateQueries({
        queryKey: customersKeys.detail(customerId ?? vars.id),
      });
    },
  });
}

export function useVerifyCustomerKyc(customerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: VerifyKycInput }) =>
      verifyCustomerKyc(args.id, args.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: customersKeys.all });
      void qc.invalidateQueries({
        queryKey: customersKeys.detail(customerId ?? vars.id),
      });
    },
  });
}

export function useActivateCustomer(customerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateCustomer(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: customersKeys.all });
      void qc.invalidateQueries({
        queryKey: customersKeys.detail(customerId ?? id),
      });
    },
  });
}

export function useDeactivateCustomer(customerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateCustomer(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: customersKeys.all });
      void qc.invalidateQueries({
        queryKey: customersKeys.detail(customerId ?? id),
      });
    },
  });
}

export function useUploadCustomerDocument(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { file: File; category?: string }) =>
      uploadCustomerDocument(customerId, args.file, args.category),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: customersKeys.documents(customerId),
      });
      void qc.invalidateQueries({
        queryKey: customersKeys.detail(customerId),
      });
    },
  });
}
