import type { CountLine } from '../types';
import { validateCountLines } from '../validation';

const materialId = '507f1f77bcf86cd799439011';

function line(partial: Partial<CountLine> = {}): CountLine {
  return {
    key: 'k1',
    materialId,
    materialCode: 'CEM',
    materialName: 'Cement',
    baseUnit: 'bag',
    systemQuantity: 100,
    physicalQuantity: 100,
    reason: '',
    photoUri: null,
    photoName: null,
    photoMimeType: null,
    photoSize: null,
    ...partial,
  };
}

describe('validateCountLines', () => {
  it('requires at least one line', () => {
    const result = validateCountLines([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.formError).toMatch(/at least one/i);
    }
  });

  it('requires reason when physical ≠ system', () => {
    const result = validateCountLines([
      line({ physicalQuantity: 95, reason: '' }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.lineErrors.k1?.reason).toMatch(/reason/i);
    }
  });

  it('accepts matching qty without reason', () => {
    expect(validateCountLines([line()]).ok).toBe(true);
  });

  it('accepts difference with reason', () => {
    expect(
      validateCountLines([
        line({ physicalQuantity: 95, reason: 'Bags torn' }),
      ]).ok,
    ).toBe(true);
  });
});
