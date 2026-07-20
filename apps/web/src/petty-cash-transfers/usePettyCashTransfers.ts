import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelPettyCashFundTransfer,
  createPettyCashFundTransfer,
  fetchApprovedRequestBalance,
  fetchBankAccountOptions,
  fetchFundablePettyCashRequirements,
  fetchPettyCashFundTransfers,
  postPettyCashFundTransfer,
  updatePettyCashFundTransfer,
  verifyPettyCashFundTransfer,
} from './api';
import { pettyCashTransfersKeys } from './queryKeys';
import type {
  CancelPettyCashFundTransferInput,
  CreatePettyCashFundTransferInput,
  ListPettyCashFundTransfersQuery,
  UpdatePettyCashFundTransferInput,
} from './types';

export function usePettyCashFundTransfersList(
  projectId: string | null | undefined,
  query: ListPettyCashFundTransfersQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: pettyCashTransfersKeys.list(projectId ?? '', query),
    queryFn: () =>
      fetchPettyCashFundTransfers({
        ...query,
        projectId: projectId ?? undefined,
      }),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useApprovedRequestBalance(
  requestId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: pettyCashTransfersKeys.balance(requestId ?? ''),
    queryFn: () => fetchApprovedRequestBalance(requestId!),
    enabled: Boolean(requestId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useFundablePettyCashRequirements(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: pettyCashTransfersKeys.fundableRequests(projectId ?? ''),
    queryFn: () => fetchFundablePettyCashRequirements(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useBankAccountOptions(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: pettyCashTransfersKeys.bankAccounts(projectId ?? ''),
    queryFn: () => fetchBankAccountOptions(projectId ?? undefined),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidateTransfers(projectId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: pettyCashTransfersKeys.all });
    void qc.invalidateQueries({
      queryKey: pettyCashTransfersKeys.fundableRequests(projectId),
    });
  };
}

export function useCreatePettyCashFundTransfer(projectId: string) {
  const invalidate = useInvalidateTransfers(projectId);
  return useMutation({
    mutationFn: (args: {
      input: CreatePettyCashFundTransferInput;
      idempotencyKey?: string;
    }) => createPettyCashFundTransfer(args.input, args.idempotencyKey),
    onSuccess: invalidate,
  });
}

export function useUpdatePettyCashFundTransfer(projectId: string) {
  const invalidate = useInvalidateTransfers(projectId);
  return useMutation({
    mutationFn: (args: {
      id: string;
      input: UpdatePettyCashFundTransferInput;
    }) => updatePettyCashFundTransfer(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useVerifyPettyCashFundTransfer(projectId: string) {
  const invalidate = useInvalidateTransfers(projectId);
  return useMutation({
    mutationFn: (id: string) => verifyPettyCashFundTransfer(id),
    onSuccess: invalidate,
  });
}

export function usePostPettyCashFundTransfer(projectId: string) {
  const invalidate = useInvalidateTransfers(projectId);
  return useMutation({
    mutationFn: (args: { id: string; idempotencyKey?: string }) =>
      postPettyCashFundTransfer(args.id, args.idempotencyKey),
    onSuccess: invalidate,
  });
}

export function useCancelPettyCashFundTransfer(projectId: string) {
  const invalidate = useInvalidateTransfers(projectId);
  return useMutation({
    mutationFn: (args: {
      id: string;
      input: CancelPettyCashFundTransferInput;
    }) => cancelPettyCashFundTransfer(args.id, args.input),
    onSuccess: invalidate,
  });
}
