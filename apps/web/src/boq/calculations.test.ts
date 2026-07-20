import { describe, expect, it } from 'vitest';
import {
  assertBoqDateRange,
  computePlannedRate,
  computePlannedValue,
  validateBoqItemTotals,
} from './calculations';

describe('BOQ calculations (Phase 079)', () => {
  it('computes plannedRate as sum of cost components', () => {
    expect(
      computePlannedRate({
        materialCost: 4500,
        labourCost: 1200,
        subcontractCost: 800,
        otherCost: 200,
      }),
    ).toBe(6700);
  });

  it('computes plannedValue as qty × rate', () => {
    expect(computePlannedValue(120, 6700)).toBe(804_000);
  });

  it('validates consistent totals', () => {
    const ok = validateBoqItemTotals({
      materialCost: 100,
      labourCost: 50,
      subcontractCost: 25,
      otherCost: 25,
      plannedQuantity: 10,
      plannedRate: 200,
      plannedValue: 2000,
    });
    expect(ok.valid).toBe(true);
    expect(ok.errors).toHaveLength(0);
  });

  it('flags inconsistent plannedRate / plannedValue', () => {
    const bad = validateBoqItemTotals({
      materialCost: 100,
      labourCost: 0,
      subcontractCost: 0,
      otherCost: 0,
      plannedQuantity: 2,
      plannedRate: 150,
      plannedValue: 999,
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => e.includes('plannedRate'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('plannedValue'))).toBe(true);
  });

  it('enforces date consistency (end ≥ start)', () => {
    expect(assertBoqDateRange('2026-01-10', '2026-01-09')).toEqual({
      ok: false,
      message: 'endDate cannot be before startDate',
    });
    expect(assertBoqDateRange('2026-01-10', '2026-01-10').ok).toBe(true);
    expect(assertBoqDateRange(null, '2026-01-10').ok).toBe(true);
  });
});
