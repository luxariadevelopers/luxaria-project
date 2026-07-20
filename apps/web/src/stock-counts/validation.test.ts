import { describe, expect, it } from 'vitest';
import type { CountGridRow } from './types';
import { validateCountGridRows } from './validation';

function row(partial: Partial<CountGridRow> & Pick<CountGridRow, 'key'>): CountGridRow {
  return {
    materialId: '507f1f77bcf86cd799439011',
    materialCode: 'CEM',
    materialName: 'Cement',
    baseUnit: 'bag',
    systemQuantity: 100,
    physicalQuantity: 100,
    reason: '',
    photo: '',
    ...partial,
  };
}

describe('validateCountGridRows', () => {
  it('requires reason when physical ≠ system', () => {
    const result = validateCountGridRows([
      row({ key: '1', physicalQuantity: 90, reason: '' }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.rows?.['1']?.reason).toMatch(/explanation/i);
    }
  });

  it('allows matching quantities without reason', () => {
    const result = validateCountGridRows([
      row({ key: '1', physicalQuantity: 100, reason: '' }),
    ]);
    expect(result.ok).toBe(true);
  });
});
