import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  activateVendor,
  blockVendor,
  createVendor,
  fetchVendor,
  fetchVendorDocuments,
  fetchVendorInvoices,
  fetchVendorLedger,
  fetchVendorPayments,
  fetchVendorProjects,
  fetchVendorQualityScore,
  fetchVendors,
  updateVendor,
  verifyVendor,
} from './api';
import { vendorsKeys } from './queryKeys';
import type {
  BlockVendorInput,
  CreateVendorInput,
  ListVendorsQuery,
  UpdateVendorInput,
  VerifyVendorInput,
} from './types';

export function useVendorsList(query: ListVendorsQuery, enabled = true) {
  return useQuery({
    queryKey: vendorsKeys.list(query),
    queryFn: () => fetchVendors(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useVendorDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: vendorsKeys.detail(id ?? ''),
    queryFn: () => fetchVendor(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVendorInput) => createVendor(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vendorsKeys.all });
    },
  });
}

export function useUpdateVendor(vendorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateVendorInput }) =>
      updateVendor(args.id, args.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vendorsKeys.all });
      void qc.invalidateQueries({
        queryKey: vendorsKeys.detail(vendorId ?? vars.id),
      });
    },
  });
}

export function useVerifyVendor(vendorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: VerifyVendorInput }) =>
      verifyVendor(args.id, args.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vendorsKeys.all });
      void qc.invalidateQueries({
        queryKey: vendorsKeys.detail(vendorId ?? vars.id),
      });
    },
  });
}

export function useActivateVendor(vendorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateVendor(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: vendorsKeys.all });
      void qc.invalidateQueries({
        queryKey: vendorsKeys.detail(vendorId ?? id),
      });
    },
  });
}

export function useBlockVendor(vendorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input?: BlockVendorInput }) =>
      blockVendor(args.id, args.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vendorsKeys.all });
      void qc.invalidateQueries({
        queryKey: vendorsKeys.detail(vendorId ?? vars.id),
      });
    },
  });
}

export function useVendorDocuments(
  vendorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorsKeys.documents(vendorId ?? ''),
    queryFn: () => fetchVendorDocuments(vendorId!),
    enabled: Boolean(vendorId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useVendorProjects(
  vendorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorsKeys.projects(vendorId ?? ''),
    queryFn: () => fetchVendorProjects(vendorId!),
    enabled: Boolean(vendorId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useVendorLedger(vendorId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: vendorsKeys.ledger(vendorId ?? ''),
    queryFn: () => fetchVendorLedger(vendorId!),
    enabled: Boolean(vendorId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useVendorInvoices(
  vendorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorsKeys.invoices(vendorId ?? ''),
    queryFn: () => fetchVendorInvoices(vendorId!),
    enabled: Boolean(vendorId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useVendorPayments(
  vendorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorsKeys.payments(vendorId ?? ''),
    queryFn: () => fetchVendorPayments(vendorId!),
    enabled: Boolean(vendorId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useVendorQualityScore(
  vendorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: vendorsKeys.qualityScore(vendorId ?? ''),
    queryFn: () => fetchVendorQualityScore(vendorId!),
    enabled: Boolean(vendorId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}
