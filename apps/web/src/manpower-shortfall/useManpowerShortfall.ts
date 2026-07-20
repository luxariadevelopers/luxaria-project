import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  acknowledgeShortfallAlert,
  evaluateShortfallAlerts,
  fetchManpowerComparison,
  fetchShortfallAlerts,
} from './api';
import { manpowerShortfallKeys } from './queryKeys';
import type {
  EvaluateShortfallQuery,
  ListShortfallAlertsQuery,
} from './types';

export function useShortfallAlertsList(
  query: ListShortfallAlertsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: manpowerShortfallKeys.list(query),
    queryFn: () => fetchShortfallAlerts(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useManpowerComparison(
  query: {
    projectId: string;
    contractorId: string;
    asOfDate: string;
  } | null,
  enabled = true,
) {
  return useQuery({
    queryKey: manpowerShortfallKeys.compare(
      query?.projectId ?? '',
      query?.contractorId ?? '',
      query?.asOfDate ?? '',
    ),
    queryFn: () => fetchManpowerComparison(query!),
    enabled:
      Boolean(query?.projectId && query.contractorId && query.asOfDate) &&
      enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidateShortfall() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: manpowerShortfallKeys.all });
  };
}

export function useEvaluateShortfallAlerts() {
  const invalidate = useInvalidateShortfall();
  return useMutation({
    mutationFn: (query: EvaluateShortfallQuery = {}) =>
      evaluateShortfallAlerts(query),
    onSuccess: invalidate,
  });
}

export function useAcknowledgeShortfallAlert() {
  const invalidate = useInvalidateShortfall();
  return useMutation({
    mutationFn: (id: string) => acknowledgeShortfallAlert(id),
    onSuccess: invalidate,
  });
}
