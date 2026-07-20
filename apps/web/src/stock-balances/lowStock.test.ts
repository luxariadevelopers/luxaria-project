import { describe, expect, it } from 'vitest';
import { isLowStock, lowStockReason } from './lowStock';
import { StockReorderAlertType } from './types';

describe('isLowStock', () => {
  it('flags forecast below-reorder / below-minimum alerts', () => {
    expect(
      isLowStock({
        quantityInBaseUnit: 50,
        reorderLevel: 10,
        minimumStock: 5,
        alerts: [StockReorderAlertType.BelowReorderLevel],
      }),
    ).toBe(true);
    expect(
      isLowStock({
        quantityInBaseUnit: 50,
        reorderLevel: 10,
        minimumStock: 5,
        alerts: [StockReorderAlertType.BelowMinimumLevel],
      }),
    ).toBe(true);
  });

  it('flags quantity below reorder or minimum levels', () => {
    expect(
      isLowStock({
        quantityInBaseUnit: 4,
        reorderLevel: 10,
        minimumStock: 0,
        alerts: [],
      }),
    ).toBe(true);
    expect(
      isLowStock({
        quantityInBaseUnit: 2,
        reorderLevel: 0,
        minimumStock: 5,
        alerts: [],
      }),
    ).toBe(true);
  });

  it('returns false when stock is healthy', () => {
    expect(
      isLowStock({
        quantityInBaseUnit: 100,
        reorderLevel: 10,
        minimumStock: 5,
        alerts: [],
      }),
    ).toBe(false);
  });
});

describe('lowStockReason', () => {
  it('prefers minimum over reorder messaging', () => {
    expect(
      lowStockReason({
        quantityInBaseUnit: 1,
        reorderLevel: 10,
        minimumStock: 5,
        alerts: [],
      }),
    ).toMatch(/minimum/);
  });
});
