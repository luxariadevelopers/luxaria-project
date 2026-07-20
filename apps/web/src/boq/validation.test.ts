import { describe, expect, it } from 'vitest';
import {
  boqItemFormSchema,
  defaultBoqItemFormValues,
  shapeBoqItemCreatePayload,
  syncBoqItemDerivedTotals,
} from './validation';
import { BoqItemStatus, BoqUnit } from './types';

describe('BOQ item form validation', () => {
  it('syncs derived totals from cost components', () => {
    expect(
      syncBoqItemDerivedTotals({
        materialCost: 100,
        labourCost: 50,
        subcontractCost: 25,
        otherCost: 25,
        plannedQuantity: 4,
      }),
    ).toEqual({ plannedRate: 200, plannedValue: 800 });
  });

  it('rejects endDate before startDate', () => {
    const result = boqItemFormSchema.safeParse({
      ...defaultBoqItemFormValues(),
      blockId: 'b',
      floorId: 'f',
      workCategoryId: 'c',
      description: 'RCC',
      unit: BoqUnit.CubicMetre,
      plannedQuantity: 1,
      materialCost: 10,
      labourCost: 0,
      subcontractCost: 0,
      otherCost: 0,
      plannedRate: 10,
      plannedValue: 10,
      startDate: '2026-02-01',
      endDate: '2026-01-01',
      status: BoqItemStatus.Draft,
    });
    expect(result.success).toBe(false);
  });

  it('shapes create payload with computed totals', () => {
    const payload = shapeBoqItemCreatePayload({
      ...defaultBoqItemFormValues(),
      blockId: 'b',
      floorId: 'f',
      workCategoryId: 'wc1',
      description: '  Columns  ',
      unit: BoqUnit.CubicMetre,
      plannedQuantity: 2,
      materialCost: 100,
      labourCost: 50,
      subcontractCost: 0,
      otherCost: 0,
      plannedRate: 0,
      plannedValue: 0,
      status: BoqItemStatus.Draft,
      notes: '  note  ',
    });
    expect(payload.workCategoryId).toBe('wc1');
    expect(payload.description).toBe('Columns');
    expect(payload.plannedRate).toBe(150);
    expect(payload.plannedValue).toBe(300);
    expect(payload.notes).toBe('note');
  });
});
