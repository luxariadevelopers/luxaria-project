import { describe, expect, it } from 'vitest';
import type { PurchaseRequestCapabilities } from './roleAccess';
import { PurchaseRequestStatus } from './types';
import { resolvePurchaseRequestActions } from './workflowActions';

const fullCaps: PurchaseRequestCapabilities = {
  canView: true,
  canRequest: true,
  canApprove: true,
  canOrder: true,
  canViewMaterials: true,
  canViewStock: true,
  canViewBoq: true,
};

describe('resolvePurchaseRequestActions', () => {
  it('allows review/reject/return on submitted', () => {
    expect(
      resolvePurchaseRequestActions(
        { status: PurchaseRequestStatus.Submitted },
        fullCaps,
      ),
    ).toEqual(expect.arrayContaining(['review', 'reject', 'return']));
  });

  it('allows approve only after reviewed', () => {
    expect(
      resolvePurchaseRequestActions(
        { status: PurchaseRequestStatus.Reviewed },
        fullCaps,
      ),
    ).toEqual(expect.arrayContaining(['approve', 'reject', 'return']));
    expect(
      resolvePurchaseRequestActions(
        { status: PurchaseRequestStatus.Submitted },
        fullCaps,
      ),
    ).not.toContain('approve');
  });

  it('allows close on approved or sourcing with purchase.order', () => {
    expect(
      resolvePurchaseRequestActions(
        { status: PurchaseRequestStatus.Approved },
        fullCaps,
      ),
    ).toContain('close');
    expect(
      resolvePurchaseRequestActions(
        { status: PurchaseRequestStatus.Sourcing },
        fullCaps,
      ),
    ).toContain('close');
    expect(
      resolvePurchaseRequestActions(
        { status: PurchaseRequestStatus.Approved },
        { ...fullCaps, canOrder: false },
      ),
    ).not.toContain('close');
  });

  it('hides approval actions without purchase.approve', () => {
    const actions = resolvePurchaseRequestActions(
      { status: PurchaseRequestStatus.Reviewed },
      { ...fullCaps, canApprove: false },
    );
    expect(actions).not.toContain('approve');
    expect(actions).not.toContain('reject');
  });
});
