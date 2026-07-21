import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchProfitAllocations,
  publishInvestorReport,
  recordInvestorProfitAllocation,
  updateInvestorDistributedProfit,
} from './api';
import type {
  ProfitAllocationListQuery,
  PublishInvestorReportInput,
  RecordInvestorProfitInput,
  UpdateDistributedProfitInput,
} from './types';

export const investorPortalManageKeys = {
  profitAllocations: (projectId: string) =>
    ['investor-portal', 'manage', 'profit-allocations', projectId] as const,
};

export function useProfitAllocations(projectId: string) {
  return useQuery({
    queryKey: investorPortalManageKeys.profitAllocations(projectId),
    queryFn: () => fetchProfitAllocations({ projectId }),
    enabled: Boolean(projectId),
  });
}

export function usePublishInvestorReport(projectId: string) {
  return useMutation({
    mutationFn: (input: Omit<PublishInvestorReportInput, 'projectId'>) =>
      publishInvestorReport({ ...input, projectId }),
  });
}

export function useRecordInvestorProfitAllocation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<RecordInvestorProfitInput, 'projectId'>) =>
      recordInvestorProfitAllocation({ ...input, projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: investorPortalManageKeys.profitAllocations(projectId),
      });
    },
  });
}

export function useUpdateInvestorDistributedProfit(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      allocationId,
      ...input
    }: UpdateDistributedProfitInput & { allocationId: string }) =>
      updateInvestorDistributedProfit(allocationId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: investorPortalManageKeys.profitAllocations(projectId),
      });
    },
  });
}

export type { ProfitAllocationListQuery };
