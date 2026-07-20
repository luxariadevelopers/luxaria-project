import { BadRequestException } from '@nestjs/common';
import { MaterialUnit } from '../material-master/schemas/material.schema';
import {
  assertApprovedQuantity,
  assertMaterialUnitAllowed,
  assertRequestedQuantity,
  buildQuantityWarnings,
} from './purchase-requests.validation';

describe('purchase-requests.validation', () => {
  it('validates requested and approved quantities', () => {
    expect(() => assertRequestedQuantity(10)).not.toThrow();
    expect(() => assertRequestedQuantity(0)).toThrow(BadRequestException);
    expect(() => assertApprovedQuantity(5, 10)).not.toThrow();
    expect(() => assertApprovedQuantity(11, 10)).toThrow(BadRequestException);
  });

  it('validates material units', () => {
    expect(() =>
      assertMaterialUnitAllowed(MaterialUnit.Bag, {
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [MaterialUnit.Ton],
      }),
    ).not.toThrow();
    expect(() =>
      assertMaterialUnitAllowed(MaterialUnit.Litre, {
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [MaterialUnit.Ton],
      }),
    ).toThrow(BadRequestException);
  });

  it('warns when requested quantity is unusually high', () => {
    const warnings = buildQuantityWarnings({
      requestedQuantity: 500,
      unit: MaterialUnit.Kilogram,
      baseUnit: MaterialUnit.Kilogram,
      conversionFactors: [],
      currentStockInBase: 20,
      reorderLevel: 50,
      minimumStock: 10,
      maximumStock: 200,
    });

    expect(warnings.some((w) => /unusually high/i.test(w))).toBe(true);
    expect(warnings.some((w) => /maximum stock/i.test(w))).toBe(true);
    expect(warnings.some((w) => /5× current stock/i.test(w))).toBe(true);
  });

  it('does not warn for normal quantities', () => {
    const warnings = buildQuantityWarnings({
      requestedQuantity: 40,
      unit: MaterialUnit.Kilogram,
      baseUnit: MaterialUnit.Kilogram,
      conversionFactors: [],
      currentStockInBase: 10,
      reorderLevel: 50,
      minimumStock: 10,
      maximumStock: 500,
    });
    expect(warnings.filter((w) => /unusually high|maximum stock|5×/i.test(w))).toEqual(
      [],
    );
  });
});
