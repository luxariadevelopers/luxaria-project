import { useMutation } from '@tanstack/react-query';
import {
  publishInvestorReport,
  recordInvestorProfitAllocation,
  updateInvestorDistributedProfit,
} from './api';
import type {
  PublishInvestorReportInput,
  RecordInvestorProfitInput,
  UpdateDistributedProfitInput,
} from './types';

export function usePublishInvestorReport(projectId: string) {
  return useMutation({
    mutationFn: (input: Omit<PublishInvestorReportInput, 'projectId'>) =>
      publishInvestorReport({ ...input, projectId }),
  });
}

export function useRecordInvestorProfitAllocation(projectId: string) {
  return useMutation({
    mutationFn: (input: Omit<RecordInvestorProfitInput, 'projectId'>) =>
      recordInvestorProfitAllocation({ ...input, projectId }),
  });
}

export function useUpdateInvestorDistributedProfit() {
  return useMutation({
    mutationFn: ({
      allocationId,
      ...input
    }: UpdateDistributedProfitInput & { allocationId: string }) =>
      updateInvestorDistributedProfit(allocationId, input),
  });
}
