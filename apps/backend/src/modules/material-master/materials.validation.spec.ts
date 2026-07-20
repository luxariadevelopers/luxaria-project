import { BadRequestException } from '@nestjs/common';
import {
  assertMaterialCategory,
  assertStockLevels,
  assertUnitConversions,
  assertWastagePercentage,
  convertToBaseUnit,
} from './materials.validation';
import { MaterialUnit } from './schemas/material.schema';

describe('materials.validation', () => {
  it('normalizes category', () => {
    expect(assertMaterialCategory('Cement')).toBe('cement');
    expect(() => assertMaterialCategory('Bad Category!')).toThrow(
      BadRequestException,
    );
  });

  it('validates unit conversions completely', () => {
    const ok = assertUnitConversions({
      baseUnit: MaterialUnit.Kilogram,
      alternateUnits: [MaterialUnit.Ton, MaterialUnit.Bag],
      conversionFactors: [
        { unit: MaterialUnit.Ton, factorToBase: 1000 },
        { unit: MaterialUnit.Bag, factorToBase: 50 },
      ],
    });
    expect(ok.alternateUnits).toEqual([MaterialUnit.Ton, MaterialUnit.Bag]);
    expect(ok.conversionFactors).toHaveLength(2);
  });

  it('rejects missing / extra / invalid conversion factors', () => {
    expect(() =>
      assertUnitConversions({
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [MaterialUnit.Ton],
        conversionFactors: [],
      }),
    ).toThrow(/Missing conversion factor/);

    expect(() =>
      assertUnitConversions({
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [],
        conversionFactors: [{ unit: MaterialUnit.Ton, factorToBase: 20 }],
      }),
    ).toThrow(/not in alternateUnits/);

    expect(() =>
      assertUnitConversions({
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [MaterialUnit.Bag],
        conversionFactors: [{ unit: MaterialUnit.Bag, factorToBase: 1 }],
      }),
    ).toThrow(/cannot appear in alternateUnits/);

    expect(() =>
      assertUnitConversions({
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [MaterialUnit.Ton],
        conversionFactors: [
          { unit: MaterialUnit.Ton, factorToBase: 20 },
          { unit: MaterialUnit.Bag, factorToBase: 1 },
        ],
      }),
    ).toThrow(/must not include the baseUnit/);

    expect(() =>
      assertUnitConversions({
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [MaterialUnit.Ton],
        conversionFactors: [{ unit: MaterialUnit.Ton, factorToBase: 0 }],
      }),
    ).toThrow(/finite number > 0/);
  });

  it('validates stock level ordering', () => {
    expect(() =>
      assertStockLevels({
        minimumStock: 10,
        reorderLevel: 20,
        maximumStock: 100,
      }),
    ).not.toThrow();

    expect(() =>
      assertStockLevels({
        minimumStock: 50,
        reorderLevel: 20,
        maximumStock: 100,
      }),
    ).toThrow(/minimumStock cannot be greater than reorderLevel/);

    expect(() =>
      assertStockLevels({
        minimumStock: 10,
        reorderLevel: 80,
        maximumStock: 50,
      }),
    ).toThrow(/reorderLevel cannot be greater than maximumStock/);
  });

  it('converts alternate units to base', () => {
    const factors = [{ unit: MaterialUnit.Ton, factorToBase: 1000 }];
    expect(
      convertToBaseUnit(
        2,
        MaterialUnit.Ton,
        MaterialUnit.Kilogram,
        factors,
      ),
    ).toBe(2000);
    expect(
      convertToBaseUnit(5, MaterialUnit.Kilogram, MaterialUnit.Kilogram, factors),
    ).toBe(5);
    expect(() =>
      convertToBaseUnit(1, MaterialUnit.Bag, MaterialUnit.Kilogram, factors),
    ).toThrow(BadRequestException);
  });

  it('validates wastage percentage', () => {
    expect(() => assertWastagePercentage(2.5)).not.toThrow();
    expect(() => assertWastagePercentage(101)).toThrow(BadRequestException);
  });
});
