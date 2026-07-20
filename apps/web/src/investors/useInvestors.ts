import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  activateInvestor,
  createInvestor,
  deactivateInvestor,
  fetchInvestor,
  fetchInvestorDocuments,
  fetchInvestors,
  updateInvestor,
  uploadInvestorDocument,
  verifyInvestorKyc,
} from './api';
import { investorsKeys } from './queryKeys';
import type {
  CreateInvestorInput,
  ListInvestorsQuery,
  UpdateInvestorInput,
  VerifyKycInput,
} from './types';

export function useInvestorsList(
  query: ListInvestorsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: investorsKeys.list(query),
    queryFn: () => fetchInvestors(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useInvestorDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: investorsKeys.detail(id ?? ''),
    queryFn: () => fetchInvestor(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useInvestorDocuments(
  investorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: investorsKeys.documents(investorId ?? ''),
    queryFn: () => fetchInvestorDocuments(investorId!),
    enabled: Boolean(investorId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCreateInvestor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvestorInput) => createInvestor(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: investorsKeys.all });
    },
  });
}

export function useUpdateInvestor(investorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateInvestorInput }) =>
      updateInvestor(args.id, args.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: investorsKeys.all });
      void qc.invalidateQueries({
        queryKey: investorsKeys.detail(investorId ?? vars.id),
      });
    },
  });
}

export function useVerifyInvestorKyc(investorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: VerifyKycInput }) =>
      verifyInvestorKyc(args.id, args.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: investorsKeys.all });
      void qc.invalidateQueries({
        queryKey: investorsKeys.detail(investorId ?? vars.id),
      });
    },
  });
}

export function useActivateInvestor(investorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateInvestor(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: investorsKeys.all });
      void qc.invalidateQueries({
        queryKey: investorsKeys.detail(investorId ?? id),
      });
    },
  });
}

export function useDeactivateInvestor(investorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateInvestor(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: investorsKeys.all });
      void qc.invalidateQueries({
        queryKey: investorsKeys.detail(investorId ?? id),
      });
    },
  });
}

export function useUploadInvestorDocument(investorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { file: File; category?: string }) =>
      uploadInvestorDocument(investorId, args.file, args.category),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: investorsKeys.documents(investorId),
      });
      void qc.invalidateQueries({
        queryKey: investorsKeys.detail(investorId),
      });
    },
  });
}
