import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelHandover,
  closeCashAccount,
  confirmHandover,
  createCashAccount,
  fetchActiveUsersForCash,
  fetchCashAccount,
  fetchCashAccountBalance,
  fetchCashAccountBalances,
  fetchCashAccounts,
  transferCustodian,
} from './api';
import { cashAccountsKeys } from './queryKeys';
import type {
  CloseCashAccountInput,
  ConfirmHandoverInput,
  CreateCashAccountInput,
  InitiateCustodianTransferInput,
  ListCashAccountsQuery,
} from './types';

export function useCashAccountsList(
  query: ListCashAccountsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: cashAccountsKeys.list(query),
    queryFn: () => fetchCashAccounts(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCashAccountDetail(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: cashAccountsKeys.detail(id ?? ''),
    queryFn: () => fetchCashAccount(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useCashAccountBalance(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: cashAccountsKeys.balance(id ?? ''),
    queryFn: () => fetchCashAccountBalance(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useCashAccountBalances(
  ids: readonly string[],
  enabled = true,
) {
  return useQuery({
    queryKey: cashAccountsKeys.balances(ids),
    queryFn: () => fetchCashAccountBalances(ids),
    enabled: enabled && ids.length > 0,
    staleTime: 10_000,
    retry: false,
  });
}

/** Custodian picker — requires `user.view`. */
export function useCashAccountUserOptions(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: [...cashAccountsKeys.all, 'users', projectId ?? 'all'],
    queryFn: () => fetchActiveUsersForCash(projectId ?? undefined),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidateCashAccounts() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: cashAccountsKeys.all });
  };
}

export function useCreateCashAccount() {
  const invalidate = useInvalidateCashAccounts();
  return useMutation({
    mutationFn: (input: CreateCashAccountInput) => createCashAccount(input),
    onSuccess: invalidate,
  });
}

export function useTransferCustodian() {
  const invalidate = useInvalidateCashAccounts();
  return useMutation({
    mutationFn: (args: {
      id: string;
      input: InitiateCustodianTransferInput;
    }) => transferCustodian(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useConfirmHandover() {
  const invalidate = useInvalidateCashAccounts();
  return useMutation({
    mutationFn: (args: { id: string; input?: ConfirmHandoverInput }) =>
      confirmHandover(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useCancelHandover() {
  const invalidate = useInvalidateCashAccounts();
  return useMutation({
    mutationFn: (id: string) => cancelHandover(id),
    onSuccess: invalidate,
  });
}

export function useCloseCashAccount() {
  const invalidate = useInvalidateCashAccounts();
  return useMutation({
    mutationFn: (args: { id: string; input?: CloseCashAccountInput }) =>
      closeCashAccount(args.id, args.input),
    onSuccess: invalidate,
  });
}
