import { buildPurchaseRequestOfflineEnqueue } from '../buildPurchaseRequestOfflineEnqueue';

describe('buildPurchaseRequestOfflineEnqueue', () => {
  const base = {
    projectId: '507f1f77bcf86cd799439011',
    requiredByDate: '2026-08-01',
    justification: 'Foundation pour next week',
    items: [
      {
        materialId: '507f1f77bcf86cd799439012',
        requestedQuantity: 10,
        unit: 'bag',
      },
    ],
  };

  it('builds create+submit enqueue without media', () => {
    const enqueue = buildPurchaseRequestOfflineEnqueue(base);
    expect(enqueue.type).toBe('purchase_request.create');
    expect(enqueue.endpoint).toBe('/purchase-requests');
    expect(enqueue.payload.submitAfterCreate).toBe(true);
    expect(enqueue.payload.items).toHaveLength(1);
    expect(enqueue.media).toBeUndefined();
  });

  it('rejects empty lines', () => {
    expect(() =>
      buildPurchaseRequestOfflineEnqueue({ ...base, items: [] }),
    ).toThrow(/line/i);
  });
});
