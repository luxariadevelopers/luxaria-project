import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveSignedPaymentVoucher,
  cancelSignedPaymentVoucher,
  fetchSignedPaymentVoucher,
  fetchSignedPaymentVouchers,
  postSignedPaymentVoucher,
  reverseSignedPaymentVoucher,
} from './api';
import { signedPaymentVouchersKeys } from './queryKeys';
import type {
  CancelSignedPaymentVoucherInput,
  ListSignedPaymentVouchersQuery,
  ReverseSignedPaymentVoucherInput,
} from './types';

export function useSignedPaymentVouchersList(
  query: ListSignedPaymentVouchersQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: signedPaymentVouchersKeys.list(query),
    queryFn: () => fetchSignedPaymentVouchers(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useSignedPaymentVoucherDetail(
  voucherId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: signedPaymentVouchersKeys.detail(voucherId ?? ''),
    queryFn: () => fetchSignedPaymentVoucher(voucherId!),
    enabled: Boolean(voucherId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

function useInvalidateSignedPaymentVouchers() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: signedPaymentVouchersKeys.all });
  };
}

export function useApproveSignedPaymentVoucher() {
  const invalidate = useInvalidateSignedPaymentVouchers();
  return useMutation({
    mutationFn: (id: string) => approveSignedPaymentVoucher(id),
    onSuccess: invalidate,
  });
}

export function usePostSignedPaymentVoucher() {
  const invalidate = useInvalidateSignedPaymentVouchers();
  return useMutation({
    mutationFn: (id: string) => postSignedPaymentVoucher(id),
    onSuccess: invalidate,
  });
}

export function useReverseSignedPaymentVoucher() {
  const invalidate = useInvalidateSignedPaymentVouchers();
  return useMutation({
    mutationFn: (args: { id: string; input: ReverseSignedPaymentVoucherInput }) =>
      reverseSignedPaymentVoucher(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useCancelSignedPaymentVoucher() {
  const invalidate = useInvalidateSignedPaymentVouchers();
  return useMutation({
    mutationFn: (args: { id: string; input: CancelSignedPaymentVoucherInput }) =>
      cancelSignedPaymentVoucher(args.id, args.input),
    onSuccess: invalidate,
  });
}
