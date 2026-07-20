import { describe, expect, it } from 'vitest';
import { MaterialUnit } from './types';
import {
  assertStockLevels,
  assertUnitConversions,
  convertToBaseUnit,
  materialFormSchema,
} from './validation';

const oid = '507f1f77bcf86cd799439011';

describe('assertUnitConversions', () => {
  it('accepts matching alternate units and factors', () => {
    const result = assertUnitConversions({
      baseUnit: MaterialUnit.Kilogram,
      alternateUnits: [MaterialUnit.Ton, MaterialUnit.Bag],
      conversionFactors: [
        { unit: MaterialUnit.Ton, factorToBase: 1000 },
        { unit: MaterialUnit.Bag, factorToBase: 50 },
      ],
    });
    expect(result).toEqual({ ok: true });
  });

  it('rejects base unit in alternateUnits', () => {
    const result = assertUnitConversions({
      baseUnit: MaterialUnit.Kilogram,
      alternateUnits: [MaterialUnit.Kilogram],
      conversionFactors: [
        { unit: MaterialUnit.Kilogram, factorToBase: 1 },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/base unit/i);
    }
  });

  it('rejects missing conversion factor', () => {
    const result = assertUnitConversions({
      baseUnit: MaterialUnit.Kilogram,
      alternateUnits: [MaterialUnit.Ton],
      conversionFactors: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Missing conversion factor/);
    }
  });

  it('rejects factor ≤ 0', () => {
    const result = assertUnitConversions({
      baseUnit: MaterialUnit.Kilogram,
      alternateUnits: [MaterialUnit.Ton],
      conversionFactors: [{ unit: MaterialUnit.Ton, factorToBase: 0 }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects orphan conversion factors', () => {
    const result = assertUnitConversions({
      baseUnit: MaterialUnit.Kilogram,
      alternateUnits: [],
      conversionFactors: [{ unit: MaterialUnit.Ton, factorToBase: 1000 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/not in alternate units/);
    }
  });
});

describe('convertToBaseUnit', () => {
  it('returns quantity unchanged for base unit', () => {
    expect(
      convertToBaseUnit(12, MaterialUnit.Kilogram, MaterialUnit.Kilogram, []),
    ).toBe(12);
  });

  it('multiplies by factorToBase for alternate unit', () => {
    expect(
      convertToBaseUnit(2, MaterialUnit.Ton, MaterialUnit.Kilogram, [
        { unit: MaterialUnit.Ton, factorToBase: 1000 },
      ]),
    ).toBe(2000);
  });

  it('throws when factor is missing', () => {
    expect(() =>
      convertToBaseUnit(1, MaterialUnit.Bag, MaterialUnit.Kilogram, []),
    ).toThrow(/No conversion factor/);
  });
});

describe('assertStockLevels', () => {
  it('accepts min ≤ reorder ≤ max', () => {
    expect(
      assertStockLevels({
        minimumStock: 10,
        reorderLevel: 50,
        maximumStock: 200,
      }),
    ).toEqual({ ok: true });
  });

  it('rejects min above reorder', () => {
    const result = assertStockLevels({
      minimumStock: 80,
      reorderLevel: 50,
      maximumStock: 200,
    });
    expect(result.ok).toBe(false);
  });
});

describe('materialFormSchema', () => {
  it('accepts a valid create payload with conversions', () => {
    const parsed = materialFormSchema.safeParse({
      name: 'OPC Cement 53 Grade',
      category: 'cement',
      specification: '50kg bag',
      brand: 'UltraTech',
      baseUnit: MaterialUnit.Bag,
      alternateUnits: [MaterialUnit.Ton],
      conversionFactors: [{ unit: MaterialUnit.Ton, factorToBase: 20 }],
      standardRate: 380,
      minimumStock: 10,
      reorderLevel: 40,
      maximumStock: 200,
      standardWastagePercentage: 2.5,
      ledgerAccountId: oid,
      status: 'active',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid category casing/format', () => {
    const parsed = materialFormSchema.safeParse({
      name: 'Steel',
      category: 'Bad Category!',
      baseUnit: MaterialUnit.Kilogram,
      alternateUnits: [],
      conversionFactors: [],
      ledgerAccountId: oid,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects conversion without factor', () => {
    const parsed = materialFormSchema.safeParse({
      name: 'Sand',
      category: 'aggregates',
      baseUnit: MaterialUnit.CubicFoot,
      alternateUnits: [MaterialUnit.Load],
      conversionFactors: [],
      ledgerAccountId: oid,
    });
    expect(parsed.success).toBe(false);
  });
});
