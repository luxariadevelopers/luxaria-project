import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  approveContractorPayment,
  cancelContractorPayment,
  createContractorPayment,
  fetchBankAccountOptions,
  fetchContractorPayment,
  fetchContractorPayments,
  fetchPayableBills,
  postContractorPayment,
  releaseContractorPayment,
  searchContractorOptions,
  submitContractorPayment,
  updateContractorPayment,
  verifyContractorPayment,
} from './api';
import { contractorPaymentsKeys } from './queryKeys';
import type {
  CreateContractorPaymentInput,
  ListContractorPaymentsQuery,
  UpdateContractorPaymentInput,
} from './types';

export function useContractorPaymentsList(
  query: ListContractorPaymentsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorPaymentsKeys.list(query),
    queryFn: () => fetchContractorPayments(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useContractorPaymentDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorPaymentsKeys.detail(id ?? ''),
    queryFn: () => fetchContractorPayment(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function usePayableBills(
  projectId: string | null | undefined,
  contractorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorPaymentsKeys.payableBills(
      projectId ?? '',
      contractorId ?? '',
    ),
    queryFn: () =>
      fetchPayableBills({
        projectId: projectId!,
        contractorId: contractorId!,
      }),
    enabled: Boolean(projectId) && Boolean(contractorId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBankAccountOptions(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorPaymentsKeys.bankAccounts(projectId ?? ''),
    queryFn: () => fetchBankAccountOptions(projectId ?? undefined),
    enabled: enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useContractorOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: contractorPaymentsKeys.contractors(search),
    queryFn: () => searchContractorOptions(search),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: contractorPaymentsKeys.all });
  };
}

export function useCreateContractorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateContractorPaymentInput) =>
      createContractorPayment(input),
    onSuccess: invalidate,
  });
}

export function useUpdateContractorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateContractorPaymentInput }) =>
      updateContractorPayment(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitContractorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => submitContractorPayment(id),
    onSuccess: invalidate,
  });
}

export function useApproveContractorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => approveContractorPayment(id),
    onSuccess: invalidate,
  });
}

export function useReleaseContractorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => releaseContractorPayment(id),
    onSuccess: invalidate,
  });
}

export function useVerifyContractorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => verifyContractorPayment(id),
    onSuccess: invalidate,
  });
}

export function usePostContractorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => postContractorPayment(id),
    onSuccess: invalidate,
  });
}

export function useCancelContractorPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cancelContractorPayment(id),
    onSuccess: invalidate,
  });
}
