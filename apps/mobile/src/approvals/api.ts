import { apiGet, apiPost } from '@/api/client';
import type { PublicApprovalRequest } from './types';

export async function listApprovals(projectId: string, params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PublicApprovalRequest[]> {
  const res = await apiGet<PublicApprovalRequest[]>(
    `/projects/${projectId}/approvals`,
    {
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
      status: params?.status,
    },
  );
  return res.data ?? [];
}

export async function getApproval(
  projectId: string,
  id: string,
): Promise<PublicApprovalRequest> {
  const res = await apiGet<PublicApprovalRequest>(
    `/projects/${projectId}/approvals/${id}`,
  );
  if (!res.data) throw new Error(res.message || 'Approval not found');
  return res.data;
}

export async function approveApproval(
  projectId: string,
  id: string,
  comment?: string | null,
): Promise<PublicApprovalRequest> {
  const res = await apiPost<PublicApprovalRequest>(
    `/projects/${projectId}/approvals/${id}/approve`,
    { comment: comment ?? null },
  );
  if (!res.data) throw new Error(res.message || 'Approve failed');
  return res.data;
}

export async function rejectApproval(
  projectId: string,
  id: string,
  comment?: string | null,
): Promise<PublicApprovalRequest> {
  const res = await apiPost<PublicApprovalRequest>(
    `/projects/${projectId}/approvals/${id}/reject`,
    { comment: comment ?? null },
  );
  if (!res.data) throw new Error(res.message || 'Reject failed');
  return res.data;
}
