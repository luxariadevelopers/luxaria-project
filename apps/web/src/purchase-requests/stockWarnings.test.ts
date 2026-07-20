import { describe, expect, it } from 'vitest';
import {
  buildQuantityWarnings,
  convertBaseToUnit,
  convertToBaseUnit,
  HIGH_QTY_STOCK_MULTIPLIER,
} from './stockWarnings';
import { MaterialUnit } from './types';

describe('convertToBaseUnit / convertBaseToUnit', () => {
  const factors = [{ unit: MaterialUnit.Ton, factorToBase: 1000 }];

  it('converts alternate unit to base', () => {
    expect(
      convertToBaseUnit(2, MaterialUnit.Ton, MaterialUnit.Kilogram, factors),
    ).toBe(2000);
  });

  it('converts base back to alternate', () => {
    expect(
      convertBaseToUnit(2000, MaterialUnit.Ton, MaterialUnit.Kilogram, factors),
    ).toBe(2);
  });

  it('returns null when factor is missing', () => {
    expect(
      convertToBaseUnit(1, MaterialUnit.Bag, MaterialUnit.Kilogram, factors),
    ).toBeNull();
  });
});

describe('buildQuantityWarnings', () => {
  const base = {
    unit: MaterialUnit.Kilogram,
    baseUnit: MaterialUnit.Kilogram,
    conversionFactors: [] as const,
    reorderLevel: 50,
    minimumStock: 20,
    maximumStock: 200,
  };

  it('warns when requested qty exceeds 5× current stock', () => {
    const warnings = buildQuantityWarnings({
      ...base,
      requestedQuantity: 100,
      currentStockInBase: 10,
    });
    expect(
      warnings.some((w) =>
        w.includes(`more than ${HIGH_QTY_STOCK_MULTIPLIER}× current stock`),
      ),
    ).toBe(true);
  });

  it('warns when current stock is already at/above reorder level', () => {
    const warnings = buildQuantityWarnings({
      ...base,
      requestedQuantity: 5,
      currentStockInBase: 60,
    });
    expect(
      warnings.some((w) => w.includes('already at/above reorder level')),
    ).toBe(true);
  });

  it('warns when requested qty exceeds maximum stock', () => {
    const warnings = buildQuantityWarnings({
      ...base,
      requestedQuantity: 250,
      currentStockInBase: 0,
      reorderLevel: 0,
      minimumStock: 0,
    });
    expect(
      warnings.some((w) => w.includes('exceeds maximum stock level')),
    ).toBe(true);
  });

  it('returns no warnings for a modest request against low stock', () => {
    const warnings = buildQuantityWarnings({
      ...base,
      requestedQuantity: 10,
      currentStockInBase: 5,
      reorderLevel: 100,
      minimumStock: 80,
      maximumStock: 500,
    });
    expect(warnings).toEqual([]);
  });
});
