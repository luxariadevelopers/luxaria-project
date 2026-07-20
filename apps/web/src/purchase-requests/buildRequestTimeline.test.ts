import { describe, expect, it } from 'vitest';
import { buildPurchaseRequestTimeline } from './buildRequestTimeline';
import {
  MaterialUnit,
  PurchaseRequestLineStatus,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
  type PublicPurchaseRequest,
} from './types';

function baseRow(
  overrides: Partial<PublicPurchaseRequest> = {},
): PublicPurchaseRequest {
  return {
    id: 'pr1',
    requestNumber: 'PR-001',
    projectId: 'proj1',
    requestedBy: 'user1',
    requiredByDate: '2026-08-01',
    priority: PurchaseRequestPriority.Normal,
    items: [
      {
        id: 'line1',
        materialId: 'm1',
        materialCode: 'CEM',
        materialName: 'Cement',
        requestedQuantity: 100,
        unit: MaterialUnit.Bag,
        currentStock: 10,
        reorderLevel: 5,
        minimumStock: 2,
        maximumStock: 200,
        estimatedRate: 380,
        boqItemId: null,
        remarks: null,
        approvedQuantity: 60,
        lineStatus: PurchaseRequestLineStatus.PartiallyApproved,
        warnings: [],
        estimatedAmount: 38000,
      },
    ],
    justification: 'Foundation pour',
    status: PurchaseRequestStatus.Approved,
    reviewedBy: 'user2',
    reviewedAt: '2026-07-10T10:00:00.000Z',
    approvedBy: 'user3',
    approvedAt: '2026-07-11T10:00:00.000Z',
    reviewNotes: 'Looks ok',
    approvalNotes: 'Approve 60 of 100',
    rejectionReason: null,
    isPartiallyApproved: true,
    warnings: [],
    estimatedTotal: 38000,
    approvedTotal: 22800,
    createdAt: '2026-07-09T10:00:00.000Z',
    updatedAt: '2026-07-11T10:00:00.000Z',
    ...overrides,
  };
}

describe('buildPurchaseRequestTimeline', () => {
  it('includes review and partial approval events', () => {
    const events = buildPurchaseRequestTimeline(baseRow());
    const actions = events.map((e) => e.action);
    expect(actions).toContain('created');
    expect(actions).toContain('submitted');
    expect(actions).toContain('reviewed');
    expect(actions).toContain('partially_approved');
  });

  it('includes rejection reason when rejected', () => {
    const events = buildPurchaseRequestTimeline(
      baseRow({
        status: PurchaseRequestStatus.Rejected,
        rejectionReason: 'Not needed',
        isPartiallyApproved: false,
      }),
    );
    const rejected = events.find((e) => e.action === 'rejected');
    expect(rejected?.comment).toBe('Not needed');
  });
});
