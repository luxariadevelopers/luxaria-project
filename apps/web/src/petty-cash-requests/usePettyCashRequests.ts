import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelPettyCashRequirement,
  closePettyCashRequirement,
  createPettyCashRequirement,
  fetchCashAccountBalance,
  fetchPettyCashAccounts,
  fetchPettyCashRequirement,
  fetchPettyCashRequirements,
  financeApproveRequirement,
  fundPettyCashRequirement,
  projectManagerApproveRequirement,
  rejectPettyCashRequirement,
  returnPettyCashRequirement,
  submitPettyCashRequirement,
  updatePettyCashRequirement,
} from './api';
import { pettyCashRequestsKeys } from './queryKeys';
import type {
  CreatePettyCashRequirementInput,
  FinanceApproveInput,
  FundRequirementInput,
  ListPettyCashRequirementsQuery,
  ReviewActionInput,
  UpdatePettyCashRequirementInput,
} from './types';

export function usePettyCashRequirementsList(
  query: ListPettyCashRequirementsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: pettyCashRequestsKeys.list(query),
    queryFn: () => fetchPettyCashRequirements(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

/** Alias for list page (Phase 048). */
export const usePettyCashRequestsList = usePettyCashRequirementsList;

export function usePettyCashRequirementDetail(
  requestId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: pettyCashRequestsKeys.detail(requestId ?? ''),
    queryFn: () => fetchPettyCashRequirement(requestId!),
    enabled: Boolean(requestId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function usePettyCashAccounts(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: pettyCashRequestsKeys.cashAccounts(projectId ?? ''),
    queryFn: () => fetchPettyCashAccounts(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useCashAccountBalance(
  cashAccountId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: pettyCashRequestsKeys.cashBalance(cashAccountId ?? ''),
    queryFn: () => fetchCashAccountBalance(cashAccountId!),
    enabled: Boolean(cashAccountId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidateRequests() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: pettyCashRequestsKeys.all });
  };
}

export function useCreatePettyCashRequirement() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (input: CreatePettyCashRequirementInput) =>
      createPettyCashRequirement(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePettyCashRequirement() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (args: {
      id: string;
      input: UpdatePettyCashRequirementInput;
    }) => updatePettyCashRequirement(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitPettyCashRequirement() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (id: string) => submitPettyCashRequirement(id),
    onSuccess: invalidate,
  });
}

export function useCancelPettyCashRequirement() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (id: string) => cancelPettyCashRequirement(id),
    onSuccess: invalidate,
  });
}

export function usePmApprovePettyCashRequirement() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (args: { id: string; input?: ReviewActionInput }) =>
      projectManagerApproveRequirement(args.id, args.input),
    onSuccess: invalidate,
  });
}

/** Alias for list page (Phase 048). */
export const useProjectManagerApproveRequirement =
  usePmApprovePettyCashRequirement;

export function useFinanceApprovePettyCashRequirement() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (args: { id: string; input?: FinanceApproveInput }) =>
      financeApproveRequirement(args.id, args.input),
    onSuccess: invalidate,
  });
}

/** Alias for list page (Phase 048). */
export const useFinanceApproveRequirement =
  useFinanceApprovePettyCashRequirement;

export function useRejectPettyCashRequirement() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (args: { id: string; input?: ReviewActionInput }) =>
      rejectPettyCashRequirement(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useReturnPettyCashRequirement() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (args: { id: string; input?: ReviewActionInput }) =>
      returnPettyCashRequirement(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useFundPettyCashRequirement() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (args: { id: string; input?: FundRequirementInput }) =>
      fundPettyCashRequirement(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useClosePettyCashRequirement() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (id: string) => closePettyCashRequirement(id),
    onSuccess: invalidate,
  });
}
