import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  activateAccount,
  createAccount,
  deactivateAccount,
  deleteAccount,
  fetchAccount,
  fetchAccountTree,
  seedStandardAccounts,
  setAccountParent,
  updateAccount,
} from './api';
import { chartOfAccountsKeys } from './queryKeys';
import type { CreateAccountInput, UpdateAccountInput } from './types';

export function useAccountTree(status?: string, enabled = true) {
  return useQuery({
    queryKey: chartOfAccountsKeys.tree(status),
    queryFn: () => fetchAccountTree(status),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useAccount(accountId: string | null, enabled = true) {
  return useQuery({
    queryKey: chartOfAccountsKeys.detail(accountId ?? ''),
    queryFn: () => fetchAccount(accountId!),
    enabled: Boolean(accountId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidateTree() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: chartOfAccountsKeys.all });
  };
}

export function useCreateAccount() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: (input: CreateAccountInput) => createAccount(input),
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateAccountInput }) =>
      updateAccount(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSetAccountParent() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: (args: { id: string; parentAccountId: string | null }) =>
      setAccountParent(args.id, args.parentAccountId),
    onSuccess: invalidate,
  });
}

export function useActivateAccount() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: (id: string) => activateAccount(id),
    onSuccess: invalidate,
  });
}

export function useDeactivateAccount() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: (id: string) => deactivateAccount(id),
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: invalidate,
  });
}

export function useSeedStandardAccounts() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: () => seedStandardAccounts(),
    onSuccess: invalidate,
  });
}
