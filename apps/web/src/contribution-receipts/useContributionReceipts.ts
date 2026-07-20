import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelContributionReceipt,
  createContributionReceipt,
  fetchBankAccountOptions,
  fetchContributionBalances,
  fetchContributionReceipts,
  postContributionReceipt,
  submitContributionReceipt,
  uploadContributionReceiptDocument,
  verifyContributionReceipt,
} from './api';
import { contributionReceiptsKeys } from './queryKeys';
import type {
  CancelContributionReceiptInput,
  CreateContributionReceiptInput,
  ListContributionReceiptsQuery,
} from './types';

export function useContributionReceiptsList(
  projectId: string | null | undefined,
  query: ListContributionReceiptsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: contributionReceiptsKeys.list(projectId ?? '', query),
    queryFn: () => fetchContributionReceipts(projectId!, query),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useContributionBalances(
  projectId: string | null | undefined,
  participantId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: contributionReceiptsKeys.balances(
      projectId ?? '',
      participantId,
    ),
    queryFn: () => fetchContributionBalances(projectId!, participantId),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBankAccountOptions(enabled = true) {
  return useQuery({
    queryKey: contributionReceiptsKeys.bankAccounts,
    queryFn: () => fetchBankAccountOptions(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidateReceipts(projectId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: contributionReceiptsKeys.all });
    void qc.invalidateQueries({
      queryKey: contributionReceiptsKeys.balances(projectId),
    });
  };
}

export function useCreateContributionReceipt(projectId: string) {
  const invalidate = useInvalidateReceipts(projectId);
  return useMutation({
    mutationFn: (args: {
      input: CreateContributionReceiptInput;
      idempotencyKey?: string;
    }) =>
      createContributionReceipt(
        projectId,
        args.input,
        args.idempotencyKey,
      ),
    onSuccess: invalidate,
  });
}

export function useSubmitContributionReceipt(projectId: string) {
  const invalidate = useInvalidateReceipts(projectId);
  return useMutation({
    mutationFn: (id: string) => submitContributionReceipt(projectId, id),
    onSuccess: invalidate,
  });
}

export function useVerifyContributionReceipt(projectId: string) {
  const invalidate = useInvalidateReceipts(projectId);
  return useMutation({
    mutationFn: (id: string) => verifyContributionReceipt(projectId, id),
    onSuccess: invalidate,
  });
}

export function usePostContributionReceipt(projectId: string) {
  const invalidate = useInvalidateReceipts(projectId);
  return useMutation({
    mutationFn: (id: string) => postContributionReceipt(projectId, id),
    onSuccess: invalidate,
  });
}

export function useCancelContributionReceipt(projectId: string) {
  const invalidate = useInvalidateReceipts(projectId);
  return useMutation({
    mutationFn: (args: {
      id: string;
      input: CancelContributionReceiptInput;
    }) => cancelContributionReceipt(projectId, args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useUploadContributionReceiptDocument(projectId: string) {
  const invalidate = useInvalidateReceipts(projectId);
  return useMutation({
    mutationFn: (args: { id: string; file: File }) =>
      uploadContributionReceiptDocument(projectId, args.id, args.file),
    onSuccess: invalidate,
  });
}
