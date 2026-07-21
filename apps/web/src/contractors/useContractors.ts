import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  activateContractor,
  blockContractor,
  createContractor,
  fetchContractor,
  fetchContractors,
  updateContractor,
  verifyContractor,
} from './api';
import { contractorsKeys } from './queryKeys';
import type {
  BlockContractorInput,
  CreateContractorInput,
  ListContractorsQuery,
  UpdateContractorInput,
  VerifyContractorInput,
} from './types';

export function useContractorsList(
  query: ListContractorsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorsKeys.list(query),
    queryFn: () => fetchContractors(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useContractorDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: contractorsKeys.detail(id ?? ''),
    queryFn: () => fetchContractor(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCreateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContractorInput) => createContractor(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: contractorsKeys.all });
    },
  });
}

export function useUpdateContractor(contractorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateContractorInput }) =>
      updateContractor(args.id, args.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: contractorsKeys.all });
      void qc.invalidateQueries({
        queryKey: contractorsKeys.detail(contractorId ?? vars.id),
      });
    },
  });
}

export function useVerifyContractor(contractorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: VerifyContractorInput }) =>
      verifyContractor(args.id, args.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: contractorsKeys.all });
      void qc.invalidateQueries({
        queryKey: contractorsKeys.detail(contractorId ?? vars.id),
      });
    },
  });
}

export function useActivateContractor(contractorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateContractor(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: contractorsKeys.all });
      void qc.invalidateQueries({
        queryKey: contractorsKeys.detail(contractorId ?? id),
      });
    },
  });
}

export function useBlockContractor(contractorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input?: BlockContractorInput }) =>
      blockContractor(args.id, args.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: contractorsKeys.all });
      void qc.invalidateQueries({
        queryKey: contractorsKeys.detail(contractorId ?? vars.id),
      });
    },
  });
}
