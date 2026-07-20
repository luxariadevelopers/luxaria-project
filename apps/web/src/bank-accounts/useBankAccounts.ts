import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateCompanyBankAccount,
  createCompanyBankAccount,
  deactivateCompanyBankAccount,
  fetchBankLedgerAccountOptions,
  fetchCompanyBankAccount,
  fetchCompanyBankAccountBalance,
  fetchCompanyBankAccountLedger,
  fetchCompanyBankAccounts,
  setDefaultCompanyBankAccount,
  updateCompanyBankAccount,
} from './api';
import { bankAccountsKeys } from './queryKeys';
import type {
  BankLedgerQuery,
  CreateCompanyBankAccountInput,
  ListCompanyBankAccountsQuery,
  SetDefaultBankAccountInput,
  UpdateCompanyBankAccountInput,
} from './types';

export function useBankAccountsList(
  query: ListCompanyBankAccountsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: bankAccountsKeys.list(query),
    queryFn: () => fetchCompanyBankAccounts(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBankAccountDetail(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: bankAccountsKeys.detail(id ?? ''),
    queryFn: () => fetchCompanyBankAccount(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useBankAccountBalance(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: bankAccountsKeys.balance(id ?? ''),
    queryFn: () => fetchCompanyBankAccountBalance(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBankAccountLedger(
  id: string | null | undefined,
  query: BankLedgerQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: bankAccountsKeys.ledger(id ?? '', query),
    queryFn: () => fetchCompanyBankAccountLedger(id!, query),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

/** COA bank ledgers for create/edit — needs `account.view`. */
export function useBankLedgerAccountOptions(enabled = true) {
  return useQuery({
    queryKey: bankAccountsKeys.bankLedgerOptions,
    queryFn: () => fetchBankLedgerAccountOptions(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidateBankAccounts() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: bankAccountsKeys.all });
  };
}

export function useCreateBankAccount() {
  const invalidate = useInvalidateBankAccounts();
  return useMutation({
    mutationFn: (input: CreateCompanyBankAccountInput) =>
      createCompanyBankAccount(input),
    onSuccess: invalidate,
  });
}

export function useUpdateBankAccount() {
  const invalidate = useInvalidateBankAccounts();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateCompanyBankAccountInput }) =>
      updateCompanyBankAccount(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useActivateBankAccount() {
  const invalidate = useInvalidateBankAccounts();
  return useMutation({
    mutationFn: (id: string) => activateCompanyBankAccount(id),
    onSuccess: invalidate,
  });
}

export function useDeactivateBankAccount() {
  const invalidate = useInvalidateBankAccounts();
  return useMutation({
    mutationFn: (id: string) => deactivateCompanyBankAccount(id),
    onSuccess: invalidate,
  });
}

export function useSetDefaultBankAccount() {
  const invalidate = useInvalidateBankAccounts();
  return useMutation({
    mutationFn: (args: { id: string; input?: SetDefaultBankAccountInput }) =>
      setDefaultCompanyBankAccount(args.id, args.input),
    onSuccess: invalidate,
  });
}
