import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFinancialYearFilterOptions } from '@/director-command-centre/api';
import {
  approvePeriodReopen,
  closeAccountingPeriod,
  createAccountingPeriod,
  fetchAccountingPeriod,
  fetchAccountingPeriods,
  fetchPeriodChecklist,
  fetchPeriodReopenRequests,
  lockAccountingPeriod,
  rejectPeriodReopen,
  requestPeriodReopen,
  runPreCloseValidation,
} from './api';
import { periodCloseKeys } from './queryKeys';
import type {
  ApprovePeriodReopenInput,
  CreateAccountingPeriodInput,
  ListAccountingPeriodsQuery,
  RejectPeriodReopenInput,
  RequestPeriodReopenInput,
} from './types';

export function useAccountingPeriodsList(
  query: ListAccountingPeriodsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: periodCloseKeys.list(query),
    queryFn: () => fetchAccountingPeriods(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useAccountingPeriodDetail(
  periodId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: periodCloseKeys.detail(periodId ?? ''),
    queryFn: () => fetchAccountingPeriod(periodId!),
    enabled: Boolean(periodId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function usePeriodChecklist(
  periodId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: periodCloseKeys.checklist(periodId ?? ''),
    queryFn: () => fetchPeriodChecklist(periodId!),
    enabled: Boolean(periodId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function usePeriodReopenRequests(
  periodId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: periodCloseKeys.reopenRequests(periodId ?? ''),
    queryFn: () => fetchPeriodReopenRequests(periodId!),
    enabled: Boolean(periodId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

/** FY filter / create options — requires `financial_year.view`. */
export function usePeriodCloseFinancialYears(enabled = true) {
  return useQuery({
    queryKey: [...periodCloseKeys.all, 'financial-years'],
    queryFn: () => fetchFinancialYearFilterOptions(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidatePeriodClose() {
  const qc = useQueryClient();
  return (periodId?: string) => {
    void qc.invalidateQueries({ queryKey: periodCloseKeys.all });
    if (periodId) {
      void qc.invalidateQueries({ queryKey: periodCloseKeys.detail(periodId) });
      void qc.invalidateQueries({
        queryKey: periodCloseKeys.checklist(periodId),
      });
      void qc.invalidateQueries({
        queryKey: periodCloseKeys.reopenRequests(periodId),
      });
    }
  };
}

export function useCreateAccountingPeriod() {
  const invalidate = useInvalidatePeriodClose();
  return useMutation({
    mutationFn: (input: CreateAccountingPeriodInput) =>
      createAccountingPeriod(input),
    onSuccess: () => invalidate(),
  });
}

export function useRunPreCloseValidation() {
  const invalidate = useInvalidatePeriodClose();
  return useMutation({
    mutationFn: (periodId: string) => runPreCloseValidation(periodId),
    onSuccess: (data) => invalidate(data.id),
  });
}

export function useLockAccountingPeriod() {
  const invalidate = useInvalidatePeriodClose();
  return useMutation({
    mutationFn: (periodId: string) => lockAccountingPeriod(periodId),
    onSuccess: (data) => invalidate(data.id),
  });
}

export function useCloseAccountingPeriod() {
  const invalidate = useInvalidatePeriodClose();
  return useMutation({
    mutationFn: (periodId: string) => closeAccountingPeriod(periodId),
    onSuccess: (data) => invalidate(data.id),
  });
}

export function useRequestPeriodReopen() {
  const invalidate = useInvalidatePeriodClose();
  return useMutation({
    mutationFn: ({
      periodId,
      input,
    }: {
      periodId: string;
      input: RequestPeriodReopenInput;
    }) => requestPeriodReopen(periodId, input),
    onSuccess: (data) => invalidate(data.periodId),
  });
}

export function useApprovePeriodReopen() {
  const invalidate = useInvalidatePeriodClose();
  return useMutation({
    mutationFn: ({
      periodId,
      requestId,
      input,
    }: {
      periodId: string;
      requestId: string;
      input?: ApprovePeriodReopenInput;
    }) => approvePeriodReopen(periodId, requestId, input),
    onSuccess: (data) => invalidate(data.period.id),
  });
}

export function useRejectPeriodReopen() {
  const invalidate = useInvalidatePeriodClose();
  return useMutation({
    mutationFn: ({
      periodId,
      requestId,
      input,
    }: {
      periodId: string;
      requestId: string;
      input: RejectPeriodReopenInput;
    }) => rejectPeriodReopen(periodId, requestId, input),
    onSuccess: (data) => invalidate(data.periodId),
  });
}
