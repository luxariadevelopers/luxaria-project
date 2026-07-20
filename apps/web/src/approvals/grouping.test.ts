import { describe, expect, it } from 'vitest';
import { ApprovalStatus } from '@luxaria/shared-types';
import { groupApprovalsByModule } from './grouping';
import type { PublicApprovalRequest } from './types';

function row(
  partial: Pick<PublicApprovalRequest, 'id' | 'module' | 'approvalCode'>,
): PublicApprovalRequest {
  return {
    id: partial.id,
    approvalCode: partial.approvalCode,
    module: partial.module,
    entityType: 'purchase_order',
    entityId: 'e1',
    projectId: 'p1',
    workflowId: 'w1',
    requestedBy: 'u1',
    requestedAt: '2026-07-01T00:00:00.000Z',
    amount: 1,
    currentStep: 1,
    status: ApprovalStatus.Pending,
    reason: null,
    stepEnteredAt: null,
    escalated: false,
    approvalHistory: [],
  };
}

describe('groupApprovalsByModule', () => {
  it('groups and sorts modules alphabetically', () => {
    const groups = groupApprovalsByModule([
      row({ id: '1', module: 'stock', approvalCode: 'A' }),
      row({ id: '2', module: 'finance', approvalCode: 'B' }),
      row({ id: '3', module: 'finance', approvalCode: 'C' }),
    ]);

    expect(groups.map((g) => g.module)).toEqual(['finance', 'stock']);
    expect(groups[0]?.items).toHaveLength(2);
    expect(groups[1]?.items).toHaveLength(1);
  });
});
