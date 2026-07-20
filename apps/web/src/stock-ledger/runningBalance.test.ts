import { describe, expect, it } from 'vitest';
import {
  filterEntriesByDateRange,
  withRunningBalances,
} from './runningBalance';
import type { PublicStockLedgerEntry } from './types';

function entry(
  partial: Partial<PublicStockLedgerEntry> &
    Pick<PublicStockLedgerEntry, 'id' | 'baseUnitQuantity' | 'transactionDate'>,
): PublicStockLedgerEntry {
  return {
    transactionNumber: `SL-${partial.id}`,
    projectId: '507f1f77bcf86cd799439011',
    materialId: '507f1f77bcf86cd799439012',
    transactionType: 'purchase_receipt',
    quantityIn: Math.max(partial.baseUnitQuantity, 0),
    quantityOut: Math.max(-partial.baseUnitQuantity, 0),
    unit: 'bag',
    baseUnit: 'bag',
    referenceType: 'goods_receipt',
    referenceId: null,
    location: null,
    batch: null,
    createdBy: '507f1f77bcf86cd799439013',
    reversalOfId: null,
    reversedById: null,
    notes: null,
    ...partial,
  };
}

describe('withRunningBalances', () => {
  it('displays chronological running balance in base units', () => {
    const rows = withRunningBalances([
      entry({
        id: 'c',
        transactionDate: '2026-07-03T00:00:00.000Z',
        baseUnitQuantity: -2,
      }),
      entry({
        id: 'a',
        transactionDate: '2026-07-01T00:00:00.000Z',
        baseUnitQuantity: 10,
      }),
      entry({
        id: 'b',
        transactionDate: '2026-07-02T00:00:00.000Z',
        baseUnitQuantity: 5,
      }),
    ]);

    const byId = Object.fromEntries(
      rows.map((r) => [r.id, r.runningBalance]),
    );
    expect(byId.a).toBe(10);
    expect(byId.b).toBe(15);
    expect(byId.c).toBe(13);
  });

  it('preserves input order while attaching balances', () => {
    const input = [
      entry({
        id: 'later',
        transactionDate: '2026-07-10',
        baseUnitQuantity: 1,
      }),
      entry({
        id: 'earlier',
        transactionDate: '2026-07-01',
        baseUnitQuantity: 4,
      }),
    ];
    const rows = withRunningBalances(input);
    expect(rows.map((r) => r.id)).toEqual(['later', 'earlier']);
    expect(rows[0]?.runningBalance).toBe(5);
    expect(rows[1]?.runningBalance).toBe(4);
  });
});

describe('filterEntriesByDateRange', () => {
  const sample = [
    entry({ id: '1', transactionDate: '2026-07-01', baseUnitQuantity: 1 }),
    entry({ id: '2', transactionDate: '2026-07-15', baseUnitQuantity: 1 }),
    entry({ id: '3', transactionDate: '2026-07-31', baseUnitQuantity: 1 }),
  ];

  it('filters inclusive date range', () => {
    const filtered = filterEntriesByDateRange(sample, '2026-07-01', '2026-07-15');
    expect(filtered.map((e) => e.id)).toEqual(['1', '2']);
  });
});
