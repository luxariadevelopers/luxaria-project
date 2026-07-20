import { describe, expect, it } from 'vitest';
import {
  emptyStockLedgerFilters,
  parseStockLedgerFilters,
} from './validation';

describe('parseStockLedgerFilters', () => {
  it('accepts empty filters', () => {
    const result = parseStockLedgerFilters(emptyStockLedgerFilters());
    expect(result.ok).toBe(true);
  });

  it('rejects invalid date range (to before from)', () => {
    const result = parseStockLedgerFilters({
      ...emptyStockLedgerFilters(),
      dateFrom: '2026-07-20',
      dateTo: '2026-07-10',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.dateTo).toMatch(/on or after/i);
    }
  });

  it('rejects non-ObjectId material id', () => {
    const result = parseStockLedgerFilters({
      ...emptyStockLedgerFilters(),
      materialId: 'not-an-id',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.materialId).toBeTruthy();
    }
  });
});
