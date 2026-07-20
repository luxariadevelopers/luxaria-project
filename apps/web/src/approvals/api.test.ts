import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalStatus } from '@luxaria/shared-types';
import {
  approveApproval,
  fetchApprovalById,
  fetchPendingApprovalCount,
  fetchProjectApprovals,
  rejectApproval,
} from './api';

const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
}));

const sampleApproval = {
  id: 'a1',
  approvalCode: 'APR-001',
  module: 'purchase',
  entityType: 'purchase_order',
  entityId: 'po1',
  projectId: 'p1',
  workflowId: 'w1',
  requestedBy: 'u1',
  requestedAt: '2026-07-01T10:00:00.000Z',
  amount: 1000,
  currentStep: 1,
  status: ApprovalStatus.Pending,
  reason: null,
  stepEnteredAt: '2026-07-02T10:00:00.000Z',
  escalated: false,
  approvalHistory: [],
};

describe('approvals API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
  });

  it('lists project approvals with status/module/entityType filters', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [sampleApproval],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });

    const result = await fetchProjectApprovals('p1', {
      page: 1,
      limit: 20,
      status: ApprovalStatus.Pending,
      module: 'purchase',
      entityType: 'purchase_order',
    });

    expect(apiGet).toHaveBeenCalledWith('/projects/p1/approvals', {
      page: 1,
      limit: 20,
      status: ApprovalStatus.Pending,
      module: 'purchase',
      entityType: 'purchase_order',
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.approvalCode).toBe('APR-001');
    expect(result.meta?.total).toBe(1);
  });

  it('derives pending count from status=pending meta.total', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      meta: {
        page: 1,
        limit: 1,
        total: 12,
        totalPages: 12,
        hasNextPage: true,
        hasPrevPage: false,
      },
    });

    await expect(fetchPendingApprovalCount('p1')).resolves.toBe(12);
    expect(apiGet).toHaveBeenCalledWith('/projects/p1/approvals', {
      status: ApprovalStatus.Pending,
      page: 1,
      limit: 1,
    });
  });

  it('fetches approval detail by id', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: sampleApproval,
    });

    const row = await fetchApprovalById('p1', 'a1');
    expect(apiGet).toHaveBeenCalledWith('/projects/p1/approvals/a1');
    expect(row?.id).toBe('a1');
  });

  it('posts approve and reject with optional comment body', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'Request fully approved',
      data: { ...sampleApproval, status: ApprovalStatus.Approved },
    });

    const approved = await approveApproval('p1', 'a1', { comment: 'ok' });
    expect(apiPost).toHaveBeenCalledWith(
      '/projects/p1/approvals/a1/approve',
      { comment: 'ok' },
    );
    expect(approved.approval.status).toBe(ApprovalStatus.Approved);

    apiPost.mockResolvedValue({
      success: true,
      message: 'Approval request rejected',
      data: { ...sampleApproval, status: ApprovalStatus.Rejected },
    });
    await rejectApproval('p1', 'a1', { comment: 'too high' });
    expect(apiPost).toHaveBeenCalledWith(
      '/projects/p1/approvals/a1/reject',
      { comment: 'too high' },
    );
  });
});
