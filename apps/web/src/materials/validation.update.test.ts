import { describe, expect, it } from 'vitest';
import { MaterialUnit } from './types';
import {
  assertBaseUnitChangeAllowed,
  buildMaterialUpdatePayload,
  isBaseUnitReadOnly,
  materialUpdateSchema,
} from './validation';

describe('base unit lock (read-only after transactions)', () => {
  it('marks base unit read-only when Nest reports baseUnitLocked', () => {
    expect(isBaseUnitReadOnly(true)).toBe(true);
    expect(isBaseUnitReadOnly(false)).toBe(false);
  });

  it('allows unchanged base unit when locked', () => {
    expect(
      assertBaseUnitChangeAllowed({
        currentBaseUnit: MaterialUnit.Kilogram,
        nextBaseUnit: MaterialUnit.Kilogram,
        baseUnitLocked: true,
      }),
    ).toEqual({ ok: true });
  });

  it('blocks unsafe base unit change when locked', () => {
    const result = assertBaseUnitChangeAllowed({
      currentBaseUnit: MaterialUnit.Kilogram,
      nextBaseUnit: MaterialUnit.Ton,
      baseUnitLocked: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/cannot be changed after stock/i);
    }
  });

  it('allows base unit change when not locked', () => {
    expect(
      assertBaseUnitChangeAllowed({
        currentBaseUnit: MaterialUnit.Kilogram,
        nextBaseUnit: MaterialUnit.Ton,
        baseUnitLocked: false,
      }),
    ).toEqual({ ok: true });
  });

  it('omits baseUnit from PATCH payload when locked', () => {
    const values = materialUpdateSchema.parse({
      name: 'OPC Cement',
      category: 'cement',
      specification: '53 Grade',
      brand: 'UltraTech',
      baseUnit: MaterialUnit.Bag,
      standardRate: 380,
      minimumStock: 10,
      reorderLevel: 20,
      maximumStock: 100,
      standardWastagePercentage: 2.5,
      ledgerAccountId: '507f1f77bcf86cd799439011',
      status: 'active',
    });

    const built = buildMaterialUpdatePayload(values, {
      currentBaseUnit: MaterialUnit.Bag,
      baseUnitLocked: true,
    });
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.input.baseUnit).toBeUndefined();
      expect(built.input.name).toBe('OPC Cement');
    }
  });

  it('rejects payload build when locked form somehow changes base unit', () => {
    const values = materialUpdateSchema.parse({
      name: 'OPC Cement',
      category: 'cement',
      specification: '',
      brand: '',
      baseUnit: MaterialUnit.Ton,
      standardRate: 380,
      minimumStock: 10,
      reorderLevel: 20,
      maximumStock: 100,
      standardWastagePercentage: 0,
      ledgerAccountId: '507f1f77bcf86cd799439011',
      status: 'active',
    });

    const built = buildMaterialUpdatePayload(values, {
      currentBaseUnit: MaterialUnit.Bag,
      baseUnitLocked: true,
    });
    expect(built.ok).toBe(false);
  });
});
