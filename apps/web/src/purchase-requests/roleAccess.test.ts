import { describe, expect, it } from 'vitest';
import { resolvePurchaseRequestCapabilities } from './roleAccess';

describe('resolvePurchaseRequestCapabilities', () => {
  it('maps Nest purchase.* / material.view / stock.view / boq.view codes', () => {
    const caps = resolvePurchaseRequestCapabilities((code) =>
      [
        'purchase.view',
        'purchase.request',
        'purchase.approve',
        'purchase.order',
        'material.view',
        'stock.view',
        'boq.view',
      ].includes(code),
    );
    expect(caps).toEqual({
      canView: true,
      canRequest: true,
      canApprove: true,
      canOrder: true,
      canViewMaterials: true,
      canViewStock: true,
      canViewBoq: true,
    });
  });

  it('does not invent purchase_request.create aliases', () => {
    const caps = resolvePurchaseRequestCapabilities((code) =>
      ['purchase_request.create', 'purchase_request.submit'].includes(code),
    );
    expect(caps.canRequest).toBe(false);
  });
});
