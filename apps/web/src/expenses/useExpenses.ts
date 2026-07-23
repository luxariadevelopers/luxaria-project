import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveSiteExpenseVoucher,
  cancelSiteExpenseVoucher,
  createSiteExpenseVoucher,
  fetchSiteExpenseVoucher,
  fetchSiteExpenseVouchers,
  postSiteExpenseVoucher,
  rejectSiteExpenseVoucher,
  returnSiteExpenseVoucher,
  submitSiteExpenseVoucher,
  updateSiteExpenseVoucher,
  verifySiteExpenseVoucher,
} from './api';
import { expensesKeys } from './queryKeys';
import type {
  CancelSiteExpenseInput,
  CreateSiteExpenseInput,
  ListSiteExpenseVouchersQuery,
  RejectSiteExpenseInput,
  ReturnSiteExpenseInput,
  UpdateSiteExpenseInput,
} from './types';

export function useSiteExpenseVouchersList(
  query: ListSiteExpenseVouchersQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: expensesKeys.list(query),
    queryFn: () => fetchSiteExpenseVouchers(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useSiteExpenseVoucherDetail(
  expenseId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: expensesKeys.detail(expenseId ?? ''),
    queryFn: () => fetchSiteExpenseVoucher(expenseId!),
    enabled: Boolean(expenseId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

function useInvalidateExpenses() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: expensesKeys.all });
  };
}

export function useCreateSiteExpenseVoucher() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: async (args: {
      input: CreateSiteExpenseInput;
      submitImmediately?: boolean;
    }) => {
      const created = await createSiteExpenseVoucher(args.input);
      if (args.submitImmediately) {
        return submitSiteExpenseVoucher(created.id);
      }
      return created;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateSiteExpenseVoucher() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateSiteExpenseInput }) =>
      updateSiteExpenseVoucher(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitSiteExpenseVoucher() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (id: string) => submitSiteExpenseVoucher(id),
    onSuccess: invalidate,
  });
}

export function useVerifySiteExpenseVoucher() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (id: string) => verifySiteExpenseVoucher(id),
    onSuccess: invalidate,
  });
}

export function useApproveSiteExpenseVoucher() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (id: string) => approveSiteExpenseVoucher(id),
    onSuccess: invalidate,
  });
}

export function usePostSiteExpenseVoucher() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (id: string) => postSiteExpenseVoucher(id),
    onSuccess: invalidate,
  });
}

export function useRejectSiteExpenseVoucher() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (args: { id: string; input: RejectSiteExpenseInput }) =>
      rejectSiteExpenseVoucher(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useReturnSiteExpenseVoucher() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (args: { id: string; input?: ReturnSiteExpenseInput }) =>
      returnSiteExpenseVoucher(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useCancelSiteExpenseVoucher() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: (args: { id: string; input: CancelSiteExpenseInput }) =>
      cancelSiteExpenseVoucher(args.id, args.input),
    onSuccess: invalidate,
  });
}
