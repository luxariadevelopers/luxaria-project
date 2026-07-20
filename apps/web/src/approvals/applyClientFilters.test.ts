import { describe, expect, it } from 'vitest';
import { ApprovalStatus } from '@luxaria/shared-types';
import { applyApprovalClientFilters } from './applyClientFilters';
import type { PublicApprovalRequest } from './types';

const now = new Date('2026-07-10T12:00:00.000Z');

function row(
  partial: Partial<PublicApprovalRequest> & Pick<PublicApprovalRequest, 'id'>,
): PublicApprovalRequest {
  return {
    approvalCode: 'APR',
    module: 'purchase',
    entityType: 'purchase_order',
    entityId: 'e1',
    projectId: '507f1f77bcf86cd799439011',
    workflowId: 'w1',
    requestedBy: 'u1',
    requestedAt: '2026-07-09T12:00:00.000Z',
    amount: 1000,
    currentStep: 1,
    status: ApprovalStatus.Pending,
    reason: null,
    stepEnteredAt: '2026-07-09T12:00:00.000Z',
    escalated: false,
    approvalHistory: [],
    ...partial,
  };
}

describe('applyApprovalClientFilters', () => {
  const items = [
    row({ id: 'a', amount: 500, requestedAt: '2026-07-10T08:00:00.000Z', stepEnteredAt: '2026-07-10T08:00:00.000Z' }),
    row({ id: 'b', amount: 2500, requestedAt: '2026-07-01T12:00:00.000Z', stepEnteredAt: '2026-07-01T12:00:00.000Z' }),
    row({
      id: 'c',
      amount: 1500,
      escalated: true,
      requestedAt: '2026-07-08T12:00:00.000Z',
      stepEnteredAt: '2026-07-08T12:00:00.000Z',
    }),
  ];

  it('filters by amount range', () => {
    const out = applyApprovalClientFilters(
      items,
      { minAmount: 1000, maxAmount: 2000, ageing: null },
      now,
    );
    expect(out.map((r) => r.id)).toEqual(['c']);
  });

  it('filters by ageing level including escalated', () => {
    const stale = applyApprovalClientFilters(
      items,
      { minAmount: null, maxAmount: null, ageing: 'stale' },
      now,
    );
    expect(stale.map((r) => r.id)).toEqual(['b']);

    const escalated = applyApprovalClientFilters(
      items,
      { minAmount: null, maxAmount: null, ageing: 'escalated' },
      now,
    );
    expect(escalated.map((r) => r.id)).toEqual(['c']);
  });
});
