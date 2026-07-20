import { describe, expect, it } from 'vitest';
import { resolvePurchaseOrderCapabilities } from './roleAccess';

describe('resolvePurchaseOrderCapabilities', () => {
  it('maps Nest purchase.* permissions (not purchase_order.*)', () => {
    const caps = resolvePurchaseOrderCapabilities((code) =>
      [
        'purchase.view',
        'purchase.order',
        'purchase.approve',
        'quotation.view',
      ].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canOrder).toBe(true);
    expect(caps.canSubmit).toBe(true);
    expect(caps.canRevise).toBe(true);
    expect(caps.canCancel).toBe(true);
    expect(caps.canClose).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canIssueLifecycle).toBe(true);
    expect(caps.canViewQuotations).toBe(true);
    expect(caps.canReceive).toBe(false);
  });

  it('maps grn.create for receive', () => {
    const caps = resolvePurchaseOrderCapabilities((code) =>
      ['purchase.view', 'grn.create'].includes(code),
    );
    expect(caps.canReceive).toBe(true);
    expect(caps.canCreate).toBe(false);
  });

  it('denies all when permissions missing', () => {
    const caps = resolvePurchaseOrderCapabilities(() => false);
    expect(caps).toEqual({
      canView: false,
      canOrder: false,
      canCreate: false,
      canSubmit: false,
      canRevise: false,
      canCancel: false,
      canClose: false,
      canIssueLifecycle: false,
      canApprove: false,
      canReceive: false,
      canViewQuotations: false,
    });
  });

  it('ignores invented purchase_order.* aliases', () => {
    const caps = resolvePurchaseOrderCapabilities((code) =>
      [
        'purchase_order.view',
        'purchase_order.create',
        'purchase_order.approve',
        'purchase_order.issue',
      ].includes(code),
    );
    expect(caps.canView).toBe(false);
    expect(caps.canCreate).toBe(false);
    expect(caps.canApprove).toBe(false);
    expect(caps.canIssueLifecycle).toBe(false);
  });
});
