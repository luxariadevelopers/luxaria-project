import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveDailyProgressReport,
  fetchDailyProgressReport,
  lockDailyProgressReport,
  regenerateDprPdf,
  reopenDailyProgressReport,
  reviewDailyProgressReport,
  verifyDailyProgressReport,
} from './api';
import { dprKeys } from './queryKeys';
import type {
  ApproveDprInput,
  ReopenDprInput,
  ReviewDprInput,
  VerifyDprInput,
} from './types';

function invalidateDpr(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
) {
  void queryClient.invalidateQueries({ queryKey: dprKeys.detail(id) });
  void queryClient.invalidateQueries({ queryKey: dprKeys.all });
}

export function useDprDetail(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: dprKeys.detail(id ?? ''),
    queryFn: () => fetchDailyProgressReport(id!),
    enabled: Boolean(id) && enabled,
    retry: false,
  });
}

export function useVerifyDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: VerifyDprInput }) =>
      verifyDailyProgressReport(id, input ?? {}),
    onSuccess: (data) => invalidateDpr(queryClient, data.id),
  });
}

export function useApproveDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ApproveDprInput }) =>
      approveDailyProgressReport(id, input ?? {}),
    onSuccess: (data) => invalidateDpr(queryClient, data.id),
  });
}

export function useLockDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lockDailyProgressReport(id),
    onSuccess: (data) => invalidateDpr(queryClient, data.id),
  });
}

export function useReviewDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewDprInput }) =>
      reviewDailyProgressReport(id, input),
    onSuccess: (data) => invalidateDpr(queryClient, data.id),
  });
}

export function useReopenDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReopenDprInput }) =>
      reopenDailyProgressReport(id, input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: dprKeys.detail(data.id),
      });
      void queryClient.invalidateQueries({ queryKey: dprKeys.all });
    },
  });
}

export function useRegenerateDprPdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => regenerateDprPdf(id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: dprKeys.detail(data.id),
      });
    },
  });
}
