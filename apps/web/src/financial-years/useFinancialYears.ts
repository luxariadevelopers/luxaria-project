import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveFinancialYearUnlock,
  createFinancialYear,
  fetchCurrentFinancialYear,
  fetchFinancialYear,
  fetchFinancialYearCompany,
  fetchFinancialYears,
  fetchFinancialYearUnlockRequests,
  lockFinancialYear,
  rejectFinancialYearUnlock,
  requestFinancialYearUnlock,
  setCurrentFinancialYear,
  validateFinancialYearTransactionDate,
} from './api';
import { financialYearKeys } from './queryKeys';
import type {
  ApproveFinancialYearUnlockInput,
  CreateFinancialYearInput,
  FinancialYearListQuery,
  RejectFinancialYearUnlockInput,
  RequestFinancialYearUnlockInput,
  UnlockRequestListQuery,
  ValidateTransactionDateInput,
} from './types';

export function useFinancialYearsList(
  query: FinancialYearListQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: financialYearKeys.list(query),
    queryFn: () => fetchFinancialYears(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useFinancialYearDetail(
  financialYearId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: financialYearKeys.detail(financialYearId ?? ''),
    queryFn: () => fetchFinancialYear(financialYearId!),
    enabled: Boolean(financialYearId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCurrentFinancialYear(
  companyId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: financialYearKeys.current(companyId),
    queryFn: () => fetchCurrentFinancialYear(companyId),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useFinancialYearUnlockRequests(
  financialYearId: string | null | undefined,
  query: UnlockRequestListQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: financialYearKeys.unlockRequests(
      financialYearId ?? '',
      query,
    ),
    queryFn: () =>
      fetchFinancialYearUnlockRequests(financialYearId!, query),
    enabled: Boolean(financialYearId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useFinancialYearCompany(
  companyId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: financialYearKeys.company(companyId),
    queryFn: () => fetchFinancialYearCompany(companyId),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

function useInvalidateFinancialYears() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: financialYearKeys.all });
}

export function useCreateFinancialYear() {
  const invalidate = useInvalidateFinancialYears();
  return useMutation({
    mutationFn: (input: CreateFinancialYearInput) =>
      createFinancialYear(input),
    onSuccess: invalidate,
  });
}

export function useSetCurrentFinancialYear() {
  const invalidate = useInvalidateFinancialYears();
  return useMutation({
    mutationFn: (financialYearId: string) =>
      setCurrentFinancialYear(financialYearId),
    onSuccess: invalidate,
  });
}

export function useLockFinancialYear() {
  const invalidate = useInvalidateFinancialYears();
  return useMutation({
    mutationFn: (financialYearId: string) =>
      lockFinancialYear(financialYearId),
    onSuccess: invalidate,
  });
}

export function useValidateFinancialYearTransactionDate() {
  return useMutation({
    mutationFn: (input: ValidateTransactionDateInput) =>
      validateFinancialYearTransactionDate(input),
  });
}

export function useRequestFinancialYearUnlock() {
  const invalidate = useInvalidateFinancialYears();
  return useMutation({
    mutationFn: ({
      financialYearId,
      input,
    }: {
      financialYearId: string;
      input: RequestFinancialYearUnlockInput;
    }) => requestFinancialYearUnlock(financialYearId, input),
    onSuccess: invalidate,
  });
}

export function useApproveFinancialYearUnlock() {
  const invalidate = useInvalidateFinancialYears();
  return useMutation({
    mutationFn: ({
      financialYearId,
      requestId,
      input,
    }: {
      financialYearId: string;
      requestId: string;
      input?: ApproveFinancialYearUnlockInput;
    }) => approveFinancialYearUnlock(financialYearId, requestId, input),
    onSuccess: invalidate,
  });
}

export function useRejectFinancialYearUnlock() {
  const invalidate = useInvalidateFinancialYears();
  return useMutation({
    mutationFn: ({
      financialYearId,
      requestId,
      input,
    }: {
      financialYearId: string;
      requestId: string;
      input: RejectFinancialYearUnlockInput;
    }) => rejectFinancialYearUnlock(financialYearId, requestId, input),
    onSuccess: invalidate,
  });
}
