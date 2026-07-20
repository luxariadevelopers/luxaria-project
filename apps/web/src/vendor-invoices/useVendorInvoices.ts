import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  approveVendorInvoice,
  cancelVendorInvoice,
  createVendorInvoice,
  fetchInvoiceableGoodsReceipts,
  fetchInvoiceablePurchaseOrders,
  fetchPurchaseOrderForInvoice,
  fetchVendorInvoice,
  fetchVendorInvoices,
  markVendorInvoicePaid,
  matchVendorInvoice,
  postVendorInvoice,
  rejectVendorInvoiceMatching,
  searchVendorOptions,
  submitVendorInvoice,
  updateVendorInvoice,
  verifyVendorInvoice,
} from './api';
import { vendorInvoicesKeys } from './queryKeys';
import type {
  ApproveVendorInvoiceInput,
  CreateVendorInvoiceInput,
  ListVendorInvoicesQuery,
  RejectMatchingInput,
  UpdateVendorInvoiceInput,
} from './types';

export function useVendorInvoicesList(
  query: ListVendorInvoicesQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorInvoicesKeys.list(query),
    queryFn: () => fetchVendorInvoices(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useVendorInvoiceDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorInvoicesKeys.detail(id ?? ''),
    queryFn: () => fetchVendorInvoice(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useInvoiceablePurchaseOrders(
  projectId: string | null | undefined,
  vendorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorInvoicesKeys.invoiceablePos(
      projectId ?? '',
      vendorId ?? '',
    ),
    queryFn: () =>
      fetchInvoiceablePurchaseOrders({
        projectId: projectId!,
        vendorId: vendorId || undefined,
      }),
    enabled: Boolean(projectId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useInvoiceableGoodsReceipts(
  projectId: string | null | undefined,
  purchaseOrderId: string | undefined,
  vendorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorInvoicesKeys.invoiceableGrns(purchaseOrderId ?? ''),
    queryFn: () =>
      fetchInvoiceableGoodsReceipts({
        projectId: projectId!,
        purchaseOrderId: purchaseOrderId!,
        vendorId: vendorId || undefined,
      }),
    enabled: Boolean(projectId) && Boolean(purchaseOrderId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function usePurchaseOrderForInvoice(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: [...vendorInvoicesKeys.all, 'po', id ?? ''] as const,
    queryFn: () => fetchPurchaseOrderForInvoice(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useVendorOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: vendorInvoicesKeys.vendors(search),
    queryFn: () => searchVendorOptions(search),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidateInvoices() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: vendorInvoicesKeys.all });
  };
}

export function useCreateVendorInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (input: CreateVendorInvoiceInput) => createVendorInvoice(input),
    onSuccess: invalidate,
  });
}

export function useUpdateVendorInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateVendorInvoiceInput }) =>
      updateVendorInvoice(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitVendorInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (id: string) => submitVendorInvoice(id),
    onSuccess: invalidate,
  });
}

export function useVerifyVendorInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (id: string) => verifyVendorInvoice(id),
    onSuccess: invalidate,
  });
}

export function useMatchVendorInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (id: string) => matchVendorInvoice(id),
    onSuccess: invalidate,
  });
}

export function useRejectVendorInvoiceMatching() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (args: { id: string; input: RejectMatchingInput }) =>
      rejectVendorInvoiceMatching(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useApproveVendorInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (args: { id: string; input?: ApproveVendorInvoiceInput }) =>
      approveVendorInvoice(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function usePostVendorInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (id: string) => postVendorInvoice(id),
    onSuccess: invalidate,
  });
}

export function useMarkVendorInvoicePaid() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (id: string) => markVendorInvoicePaid(id),
    onSuccess: invalidate,
  });
}

export function useCancelVendorInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (id: string) => cancelVendorInvoice(id),
    onSuccess: invalidate,
  });
}
