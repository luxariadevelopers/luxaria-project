import { buildStockCountOfflineEnqueue } from '../buildStockCountOfflineEnqueue';
import type { CountLine } from '../types';
import { STOCK_COUNT_OFFLINE_TYPE } from '../types';

const materialId = '507f1f77bcf86cd799439011';

function line(partial: Partial<CountLine> = {}): CountLine {
  return {
    key: 'k1',
    materialId,
    materialCode: 'CEM',
    materialName: 'Cement',
    baseUnit: 'bag',
    systemQuantity: 100,
    physicalQuantity: 95,
    reason: 'Shortage',
    photoUri: 'file:///count.jpg',
    photoName: 'count.jpg',
    photoMimeType: 'image/jpeg',
    photoSize: 2048,
    ...partial,
  };
}

describe('buildStockCountOfflineEnqueue', () => {
  it('builds create+submit enqueue with item photo field keys', () => {
    const enqueue = buildStockCountOfflineEnqueue({
      projectId: '507f1f77bcf86cd799439012',
      countDate: '2026-07-20',
      location: 'Main Store',
      lines: [line()],
      labelHint: 'LX-01',
    });

    expect(enqueue.type).toBe(STOCK_COUNT_OFFLINE_TYPE);
    expect(enqueue.endpoint).toBe('/stock-counts');
    expect(enqueue.payload.submitAfterCreate).toBe(true);
    expect(enqueue.media?.[0]?.fieldKey).toBe('itemPhoto_0');
    expect(enqueue.media?.[0]?.uploadMeta).toMatchObject({
      module: 'inventory',
      entityType: 'stock_count',
    });
    const items = enqueue.payload.items as Array<{ reason: string | null }>;
    expect(items[0]?.reason).toBe('Shortage');
  });

  it('rejects lines with unexplained variance', () => {
    expect(() =>
      buildStockCountOfflineEnqueue({
        projectId: '507f1f77bcf86cd799439012',
        countDate: '2026-07-20',
        lines: [line({ reason: '' })],
      }),
    ).toThrow(/reason|invalid/i);
  });
});
