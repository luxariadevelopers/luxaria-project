import { useQuery } from '@tanstack/react-query';
import {
  fetchApprovalById,
  fetchPendingApprovalCount,
  fetchProjectApprovals,
} from './api';
import {
  approvalDetailQueryKey,
  approvalsListQueryKey,
  approvalsPendingCountQueryKey,
} from './queryKeys';
import type { ListApprovalsQuery } from './types';

export function useApprovalsList(
  projectId: string | null,
  query: ListApprovalsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: approvalsListQueryKey(projectId ?? '', query),
    queryFn: () => fetchProjectApprovals(projectId!, query),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
  });
}

export function usePendingApprovalCount(
  projectId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: approvalsPendingCountQueryKey(projectId ?? ''),
    queryFn: () => fetchPendingApprovalCount(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useApprovalDetail(
  projectId: string | null,
  approvalId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: approvalDetailQueryKey(projectId ?? '', approvalId ?? ''),
    queryFn: () => fetchApprovalById(projectId!, approvalId!),
    enabled: Boolean(projectId && approvalId) && enabled,
    staleTime: 15_000,
  });
}
