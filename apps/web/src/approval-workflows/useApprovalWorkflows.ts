import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchApprovalWorkflow,
  upsertApprovalWorkflow,
} from './api';
import { approvalWorkflowKeys } from './queryKeys';
import type { UpsertApprovalWorkflowInput } from './types';

export function useApprovalWorkflow(
  module: string,
  entityType: string,
  enabled = true,
) {
  const trimmedModule = module.trim().toLowerCase();
  const trimmedEntityType = entityType.trim().toLowerCase();
  const canQuery = enabled && Boolean(trimmedModule && trimmedEntityType);

  return useQuery({
    queryKey: approvalWorkflowKeys.detail(trimmedModule, trimmedEntityType),
    queryFn: () => fetchApprovalWorkflow(trimmedModule, trimmedEntityType),
    enabled: canQuery,
    staleTime: 15_000,
    retry: false,
  });
}

export function useUpsertApprovalWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertApprovalWorkflowInput) =>
      upsertApprovalWorkflow(input),
    onSuccess: (result) => {
      void qc.invalidateQueries({
        queryKey: approvalWorkflowKeys.detail(
          result.workflow.module,
          result.workflow.entityType,
        ),
      });
    },
  });
}
