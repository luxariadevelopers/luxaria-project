import { BadRequestException } from '@nestjs/common';
import {
  assertBoqItemTotals,
  computePlannedRate,
  computePlannedValue,
  parseBoqUnit,
  validateBoqItemTotals,
} from './boq.validation';
import { BoqUnit } from './schemas/boq.schema';

describe('boq.validation', () => {
  it('computes planned rate and value', () => {
    expect(
      computePlannedRate({
        materialCost: 4500,
        labourCost: 1200,
        subcontractCost: 800,
        otherCost: 200,
      }),
    ).toBe(6700);
    expect(computePlannedValue(120, 6700)).toBe(804000);
  });

  it('validates matching totals', () => {
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
  });

  it('rejects rate/value mismatches', () => {
    expect(() =>
      assertBoqItemTotals({
        materialCost: 100,
        labourCost: 0,
        subcontractCost: 0,
        otherCost: 0,
        plannedQuantity: 2,
        plannedRate: 150,
        plannedValue: 300,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertBoqItemTotals({
        materialCost: 100,
        labourCost: 0,
        subcontractCost: 0,
        otherCost: 0,
        plannedQuantity: 2,
        plannedRate: 100,
        plannedValue: 250,
      }),
    ).toThrow(BadRequestException);
  });

  it('parses unit aliases', () => {
    expect(parseBoqUnit('cum')).toBe(BoqUnit.CubicMetre);
    expect(parseBoqUnit('sqm')).toBe(BoqUnit.SquareMetre);
    expect(parseBoqUnit('nos')).toBe(BoqUnit.Number);
    expect(() => parseBoqUnit('widgets')).toThrow(BadRequestException);
  });
});
