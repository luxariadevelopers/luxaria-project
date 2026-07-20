import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDailyProgressReport,
  regenerateDprPdf,
  reopenDailyProgressReport,
  reviewDailyProgressReport,
} from './api';
import { dprQueryKeys } from './queryKeys';
import type { ReopenDprInput, ReviewDprInput } from './types';

export function useDprDetail(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: dprQueryKeys.detail(id ?? ''),
    queryFn: () => fetchDailyProgressReport(id!),
    enabled: Boolean(id) && enabled,
    retry: false,
  });
}

export function useReviewDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewDprInput }) =>
      reviewDailyProgressReport(id, input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: dprQueryKeys.detail(data.id),
      });
      void queryClient.invalidateQueries({ queryKey: ['daily-progress-reports'] });
    },
  });
}

export function useReopenDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReopenDprInput }) =>
      reopenDailyProgressReport(id, input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: dprQueryKeys.detail(data.id),
      });
      void queryClient.invalidateQueries({ queryKey: ['daily-progress-reports'] });
    },
  });
}

export function useRegenerateDprPdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => regenerateDprPdf(id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: dprQueryKeys.detail(data.id),
      });
    },
  });
}
