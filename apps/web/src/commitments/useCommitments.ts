import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  amendCommitment,
  approveCommitment,
  cancelCommitment,
  createCommitment,
  fetchCommitment,
  fetchCommitmentHistory,
  fetchCommitments,
  fetchCommitmentSummary,
  recordCommitmentReceipt,
  submitCommitment,
  type RecordReceiptInput,
} from './api';
import { commitmentsKeys } from './queryKeys';
import type {
  AmendCommitmentInput,
  CancelCommitmentInput,
  CreateCommitmentInput,
  ListCommitmentsQuery,
} from './types';

export function useCommitmentsList(
  projectId: string | null | undefined,
  query: ListCommitmentsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: commitmentsKeys.list(projectId ?? '', query),
    queryFn: () => fetchCommitments(projectId!, query),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCommitmentSummary(
  projectId: string | null | undefined,
  participantId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: commitmentsKeys.summary(projectId ?? '', participantId),
    queryFn: () => fetchCommitmentSummary(projectId!, participantId),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCommitmentDetail(
  projectId: string | null | undefined,
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: commitmentsKeys.detail(projectId ?? '', id ?? ''),
    queryFn: () => fetchCommitment(projectId!, id!),
    enabled: Boolean(projectId) && Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useCommitmentHistory(
  projectId: string | null | undefined,
  commitmentNumber: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: commitmentsKeys.history(
      projectId ?? '',
      commitmentNumber ?? '',
    ),
    queryFn: () =>
      fetchCommitmentHistory(projectId!, commitmentNumber!),
    enabled: Boolean(projectId) && Boolean(commitmentNumber) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

function useInvalidateCommitments(projectId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: commitmentsKeys.all });
    void qc.invalidateQueries({
      queryKey: commitmentsKeys.summary(projectId),
    });
  };
}

export function useCreateCommitment(projectId: string) {
  const invalidate = useInvalidateCommitments(projectId);
  return useMutation({
    mutationFn: (input: CreateCommitmentInput) =>
      createCommitment(projectId, input),
    onSuccess: invalidate,
  });
}

export function useSubmitCommitment(projectId: string) {
  const invalidate = useInvalidateCommitments(projectId);
  return useMutation({
    mutationFn: (id: string) => submitCommitment(projectId, id),
    onSuccess: invalidate,
  });
}

export function useApproveCommitment(projectId: string) {
  const invalidate = useInvalidateCommitments(projectId);
  return useMutation({
    mutationFn: (id: string) => approveCommitment(projectId, id),
    onSuccess: invalidate,
  });
}

export function useAmendCommitment(projectId: string) {
  const invalidate = useInvalidateCommitments(projectId);
  return useMutation({
    mutationFn: (args: { id: string; input: AmendCommitmentInput }) =>
      amendCommitment(projectId, args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useCancelCommitment(projectId: string) {
  const invalidate = useInvalidateCommitments(projectId);
  return useMutation({
    mutationFn: (args: { id: string; input: CancelCommitmentInput }) =>
      cancelCommitment(projectId, args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useRecordCommitmentReceipt(projectId: string) {
  const invalidate = useInvalidateCommitments(projectId);
  return useMutation({
    mutationFn: (args: { id: string; input: RecordReceiptInput }) =>
      recordCommitmentReceipt(projectId, args.id, args.input),
    onSuccess: invalidate,
  });
}
