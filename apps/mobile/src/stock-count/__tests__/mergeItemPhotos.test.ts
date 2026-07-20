import {
  mergeStockCountItemPhotos,
  wantsStockCountSubmitAfterCreate,
} from '../mergeItemPhotos';

describe('mergeStockCountItemPhotos', () => {
  it('writes document ids onto items[i].photo from itemPhoto_i', () => {
    const merged = mergeStockCountItemPhotos({
      projectId: 'p1',
      items: [
        { materialId: 'm1', physicalQuantity: 1, reason: null, photo: null },
        { materialId: 'm2', physicalQuantity: 2, reason: 'x', photo: null },
      ],
      itemPhoto_0: 'doc-a',
      itemPhoto_1: 'doc-b',
      attachments: { itemPhoto_0: 'doc-a', itemPhoto_1: 'doc-b' },
      submitAfterCreate: true,
      clientTransactionId: 'txn-1',
      idempotencyKey: 'idem-1',
      deviceTimestamp: '2026-07-20T00:00:00.000Z',
    });

    expect(merged.submitAfterCreate).toBeUndefined();
    expect(merged.attachments).toBeUndefined();
    expect(merged.itemPhoto_0).toBeUndefined();
    const items = merged.items as Array<{ photo: string | null }>;
    expect(items[0]?.photo).toBe('doc-a');
    expect(items[1]?.photo).toBe('doc-b');
  });

  it('detects submit-after-create from type or flag', () => {
    expect(
      wantsStockCountSubmitAfterCreate('stock_count.create_submit', {}),
    ).toBe(true);
    expect(
      wantsStockCountSubmitAfterCreate('grn.create', { submitAfterCreate: true }),
    ).toBe(true);
    expect(wantsStockCountSubmitAfterCreate('grn.create', {})).toBe(false);
  });
});
