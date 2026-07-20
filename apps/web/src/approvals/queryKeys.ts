import type { ListApprovalsQuery } from './types';

export const APPROVALS_QUERY_KEY = ['approvals'] as const;

export const approvalsListQueryKey = (
  projectId: string,
  query: ListApprovalsQuery,
) => [...APPROVALS_QUERY_KEY, 'list', projectId, query] as const;

export const approvalsPendingCountQueryKey = (projectId: string) =>
  [...APPROVALS_QUERY_KEY, 'pending-count', projectId] as const;

export const approvalDetailQueryKey = (
  projectId: string,
  approvalId: string,
) => [...APPROVALS_QUERY_KEY, 'detail', projectId, approvalId] as const;
