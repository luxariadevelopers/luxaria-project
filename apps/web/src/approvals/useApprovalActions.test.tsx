import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalStatus } from '@luxaria/shared-types';
import { approvalDetailQueryKey } from './queryKeys';
import { useApprovalActions } from './useApprovalActions';

const approveApproval = vi.fn();
const rejectApproval = vi.fn();
const returnApproval = vi.fn();
const cancelApproval = vi.fn();

vi.mock('./api', () => ({
  approveApproval: (...args: unknown[]) => approveApproval(...args),
  rejectApproval: (...args: unknown[]) => rejectApproval(...args),
  returnApproval: (...args: unknown[]) => returnApproval(...args),
  cancelApproval: (...args: unknown[]) => cancelApproval(...args),
}));

const notify = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));

vi.mock('@/components/NotificationProvider', () => ({
  useNotify: () => notify,
}));

const pendingApproval = {
  id: 'a1',
  approvalCode: 'APR-001',
  module: 'purchase',
  entityType: 'purchase_order',
  entityId: 'po1',
  projectId: 'p1',
  workflowId: 'w1',
  requestedBy: 'u2',
  requestedAt: '2026-07-01T10:00:00.000Z',
  amount: 1000,
  currentStep: 1,
  status: ApprovalStatus.Pending,
  reason: null,
  stepEnteredAt: '2026-07-02T10:00:00.000Z',
  escalated: false,
  approvalHistory: [],
};

const approvedApproval = {
  ...pendingApproval,
  status: ApprovalStatus.Approved,
};

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useApprovalActions', () => {
  beforeEach(() => {
    approveApproval.mockReset();
    rejectApproval.mockReset();
    returnApproval.mockReset();
    cancelApproval.mockReset();
    notify.success.mockReset();
    notify.error.mockReset();
    notify.warning.mockReset();
  });

  it('does not apply optimistic status before the server responds', async () => {
    let resolveApprove: ((value: unknown) => void) | undefined;
    approveApproval.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveApprove = resolve;
        }),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const key = approvalDetailQueryKey('p1', 'a1');
    client.setQueryData(key, pendingApproval);

    const { result } = renderHook(
      () => useApprovalActions({ projectId: 'p1', approvalId: 'a1' }),
      { wrapper: createWrapper(client) },
    );

    act(() => {
      result.current.approve.mutate({ comment: null });
    });

    await waitFor(() => {
      expect(resolveApprove).toBeTypeOf('function');
    });

    // Still pending while the request is in flight — no optimistic flip.
    expect(client.getQueryData(key)).toEqual(pendingApproval);
    expect(
      (client.getQueryData(key) as typeof pendingApproval).status,
    ).toBe(ApprovalStatus.Pending);

    await act(async () => {
      resolveApprove?.({
        approval: approvedApproval,
        message: 'Request fully approved',
      });
    });

    await waitFor(() => {
      expect(client.getQueryData(key)).toEqual(approvedApproval);
    });
    expect(notify.success).toHaveBeenCalled();
  });

  it('refetches on conflict (409) instead of keeping a stale local status', async () => {
    approveApproval.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          success: false,
          errorCode: 'CONFLICT',
          message: 'You have already approved this step',
          details: [],
          requestId: 'req-1',
          timestamp: new Date().toISOString(),
        },
      },
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const key = approvalDetailQueryKey('p1', 'a1');
    client.setQueryData(key, pendingApproval);
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(
      () => useApprovalActions({ projectId: 'p1', approvalId: 'a1' }),
      { wrapper: createWrapper(client) },
    );

    await act(async () => {
      result.current.approve.mutate({ comment: null });
    });

    await waitFor(() => {
      expect(notify.warning).toHaveBeenCalled();
    });

    // Cache must not have been optimistically flipped to approved.
    expect(
      (client.getQueryData(key) as typeof pendingApproval).status,
    ).toBe(ApprovalStatus.Pending);
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('surfaces self-approval / eligibility as forbidden without mutating cache', async () => {
    approveApproval.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          success: false,
          errorCode: 'FORBIDDEN',
          message: 'Requester cannot act on their own approval request',
          details: [],
          requestId: 'req-2',
          timestamp: new Date().toISOString(),
        },
      },
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const key = approvalDetailQueryKey('p1', 'a1');
    client.setQueryData(key, pendingApproval);

    const { result } = renderHook(
      () => useApprovalActions({ projectId: 'p1', approvalId: 'a1' }),
      { wrapper: createWrapper(client) },
    );

    await act(async () => {
      result.current.approve.mutate({ comment: null });
    });

    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith(
        expect.stringContaining('Requester cannot act'),
      );
    });
    expect(
      (client.getQueryData(key) as typeof pendingApproval).status,
    ).toBe(ApprovalStatus.Pending);
  });
});
