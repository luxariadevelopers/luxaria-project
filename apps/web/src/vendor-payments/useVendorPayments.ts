import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  approveVendorPayment,
  cancelVendorPayment,
  createVendorPayment,
  fetchBankAccountOptions,
  fetchPayableInvoices,
  fetchVendorPayment,
  fetchVendorPayments,
  postVendorPayment,
  releaseVendorPayment,
  searchVendorOptions,
  submitVendorPayment,
  updateVendorPayment,
  verifyVendorPayment,
} from './api';
import { vendorPaymentsKeys } from './queryKeys';
import type {
  CreateVendorPaymentInput,
  ListVendorPaymentsQuery,
  UpdateVendorPaymentInput,
} from './types';

export function useVendorPaymentsList(
  query: ListVendorPaymentsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorPaymentsKeys.list(query),
    queryFn: () => fetchVendorPayments(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useVendorPaymentDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorPaymentsKeys.detail(id ?? ''),
    queryFn: () => fetchVendorPayment(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function usePayableInvoices(
  projectId: string | null | undefined,
  vendorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorPaymentsKeys.payableInvoices(
      projectId ?? '',
      vendorId ?? '',
    ),
    queryFn: () =>
      fetchPayableInvoices({
        projectId: projectId!,
        vendorId: vendorId!,
      }),
    enabled: Boolean(projectId) && Boolean(vendorId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBankAccountOptions(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorPaymentsKeys.bankAccounts(projectId ?? ''),
    queryFn: () => fetchBankAccountOptions(projectId ?? undefined),
    enabled: enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useVendorOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: vendorPaymentsKeys.vendors(search),
    queryFn: () => searchVendorOptions(search),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: vendorPaymentsKeys.all });
  };
}

export function useCreateVendorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateVendorPaymentInput) => createVendorPayment(input),
    onSuccess: invalidate,
  });
}

export function useUpdateVendorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateVendorPaymentInput }) =>
      updateVendorPayment(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitVendorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => submitVendorPayment(id),
    onSuccess: invalidate,
  });
}

export function useApproveVendorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => approveVendorPayment(id),
    onSuccess: invalidate,
  });
}

export function useReleaseVendorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => releaseVendorPayment(id),
    onSuccess: invalidate,
  });
}

export function useVerifyVendorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => verifyVendorPayment(id),
    onSuccess: invalidate,
  });
}

export function usePostVendorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => postVendorPayment(id),
    onSuccess: invalidate,
  });
}

export function useCancelVendorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cancelVendorPayment(id),
    onSuccess: invalidate,
  });
}
