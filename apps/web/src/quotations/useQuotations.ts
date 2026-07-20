import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelVendorQuotation,
  createVendorQuotation,
  fetchEligiblePurchaseRequests,
  fetchPurchaseRequestForQuote,
  fetchVendorQuotation,
  fetchVendorQuotations,
  markVendorQuotationFinal,
  reviseVendorQuotation,
  searchVendorOptions,
  submitVendorQuotation,
  updateVendorQuotation,
  uploadVendorQuotationDocument,
} from './api';
import { quotationsKeys } from './queryKeys';
import type {
  CreateVendorQuotationInput,
  ListVendorQuotationsQuery,
  ReviseVendorQuotationInput,
  UpdateVendorQuotationInput,
} from './types';

export function useVendorQuotationsList(
  query: ListVendorQuotationsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: quotationsKeys.list(query),
    queryFn: () => fetchVendorQuotations(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useVendorQuotationDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: quotationsKeys.detail(id ?? ''),
    queryFn: () => fetchVendorQuotation(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useEligiblePurchaseRequests(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: quotationsKeys.eligiblePrs(projectId ?? ''),
    queryFn: () => fetchEligiblePurchaseRequests(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function usePurchaseRequestForQuote(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: quotationsKeys.purchaseRequest(id ?? ''),
    queryFn: () => fetchPurchaseRequestForQuote(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useVendorOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: quotationsKeys.vendors(search),
    queryFn: () => searchVendorOptions(search),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

function useInvalidateQuotations() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: quotationsKeys.all });
  };
}

export function useCreateVendorQuotation() {
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationFn: (input: CreateVendorQuotationInput) =>
      createVendorQuotation(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateVendorQuotation() {
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateVendorQuotationInput }) =>
      updateVendorQuotation(args.id, args.input),
    onSuccess: () => invalidate(),
  });
}

export function useSubmitVendorQuotation() {
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationFn: (id: string) => submitVendorQuotation(id),
    onSuccess: () => invalidate(),
  });
}

export function useReviseVendorQuotation() {
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationFn: (args: { id: string; input?: ReviseVendorQuotationInput }) =>
      reviseVendorQuotation(args.id, args.input ?? {}),
    onSuccess: () => invalidate(),
  });
}

export function useMarkVendorQuotationFinal() {
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationFn: (id: string) => markVendorQuotationFinal(id),
    onSuccess: () => invalidate(),
  });
}

export function useCancelVendorQuotation() {
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationFn: (id: string) => cancelVendorQuotation(id),
    onSuccess: () => invalidate(),
  });
}

export function useUploadVendorQuotationDocument() {
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationFn: (args: { id: string; file: File }) =>
      uploadVendorQuotationDocument(args.id, args.file),
    onSuccess: () => invalidate(),
  });
}
