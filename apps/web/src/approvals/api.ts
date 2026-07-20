import { ApprovalStatus } from '@luxaria/shared-types';
import { apiGet, apiPost } from '@/api/client';
import type {
  ApprovalsListResult,
  ListApprovalsQuery,
  PublicApprovalRequest,
} from './types';

export type ApprovalActionBody = {
  comment?: string | null;
};

export type CancelApprovalBody = {
  reason?: string | null;
};

function normaliseApproval(
  row: PublicApprovalRequest,
): PublicApprovalRequest {
  return {
    ...row,
    requestedAt:
      typeof row.requestedAt === 'string'
        ? row.requestedAt
        : new Date(row.requestedAt).toISOString(),
    stepEnteredAt: row.stepEnteredAt
      ? typeof row.stepEnteredAt === 'string'
        ? row.stepEnteredAt
        : new Date(row.stepEnteredAt).toISOString()
      : null,
    approvalHistory: (row.approvalHistory ?? []).map((h) => ({
      ...h,
      at: typeof h.at === 'string' ? h.at : new Date(h.at).toISOString(),
    })),
  };
}

/**
 * `GET /projects/:projectId/approvals`
 * Permission: `approval.view` (+ project access on the backend).
 */
export async function fetchProjectApprovals(
  projectId: string,
  query: ListApprovalsQuery = {},
): Promise<ApprovalsListResult> {
  const res = await apiGet<PublicApprovalRequest[]>(
    `/projects/${projectId}/approvals`,
    { ...query },
  );
  return {
    items: (res.data ?? []).map(normaliseApproval),
    meta: res.meta
      ? {
          page: Number(res.meta.page ?? query.page ?? 1),
          limit: Number(res.meta.limit ?? query.limit ?? 20),
          total: Number(res.meta.total ?? 0),
          totalPages: Number(res.meta.totalPages ?? 0),
          hasNextPage: Boolean(res.meta.hasNextPage),
          hasPrevPage: Boolean(res.meta.hasPrevPage),
        }
      : null,
  };
}

/**
 * Pending count for header badge — no dedicated count endpoint.
 * Uses `status=pending` list `meta.total`.
 */
export async function fetchPendingApprovalCount(
  projectId: string,
): Promise<number> {
  const result = await fetchProjectApprovals(projectId, {
    status: ApprovalStatus.Pending,
    page: 1,
    limit: 1,
  });
  return result.meta?.total ?? 0;
}

/**
 * `GET /projects/:projectId/approvals/:id`
 * Permission: `approval.view`.
 */
export async function fetchApprovalById(
  projectId: string,
  approvalId: string,
): Promise<PublicApprovalRequest | null> {
  const res = await apiGet<PublicApprovalRequest>(
    `/projects/${projectId}/approvals/${approvalId}`,
  );
  return res.data ? normaliseApproval(res.data) : null;
}

/**
 * `POST /projects/:projectId/approvals/:id/approve`
 * Permission: `approval.act` (+ project approve access).
 */
export async function approveApproval(
  projectId: string,
  approvalId: string,
  body: ApprovalActionBody = {},
): Promise<{ approval: PublicApprovalRequest; message: string }> {
  const res = await apiPost<PublicApprovalRequest>(
    `/projects/${projectId}/approvals/${approvalId}/approve`,
    body,
  );
  if (!res.data) {
    throw new Error(res.message || 'Approve failed');
  }
  return { approval: normaliseApproval(res.data), message: res.message };
}

/**
 * `POST /projects/:projectId/approvals/:id/reject`
 * Permission: `approval.act`.
 */
export async function rejectApproval(
  projectId: string,
  approvalId: string,
  body: ApprovalActionBody = {},
): Promise<{ approval: PublicApprovalRequest; message: string }> {
  const res = await apiPost<PublicApprovalRequest>(
    `/projects/${projectId}/approvals/${approvalId}/reject`,
    body,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject failed');
  }
  return { approval: normaliseApproval(res.data), message: res.message };
}

/**
 * `POST /projects/:projectId/approvals/:id/return`
 * Permission: `approval.act`.
 */
export async function returnApproval(
  projectId: string,
  approvalId: string,
  body: ApprovalActionBody = {},
): Promise<{ approval: PublicApprovalRequest; message: string }> {
  const res = await apiPost<PublicApprovalRequest>(
    `/projects/${projectId}/approvals/${approvalId}/return`,
    body,
  );
  if (!res.data) {
    throw new Error(res.message || 'Return failed');
  }
  return { approval: normaliseApproval(res.data), message: res.message };
}

/**
 * `POST /projects/:projectId/approvals/:id/cancel`
 * Permission: requester, or `approval.cancel` for others.
 */
export async function cancelApproval(
  projectId: string,
  approvalId: string,
  body: CancelApprovalBody = {},
): Promise<{ approval: PublicApprovalRequest; message: string }> {
  const res = await apiPost<PublicApprovalRequest>(
    `/projects/${projectId}/approvals/${approvalId}/cancel`,
    body,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel failed');
  }
  return { approval: normaliseApproval(res.data), message: res.message };
}
