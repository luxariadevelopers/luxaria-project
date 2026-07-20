import {
  assertPositiveReturnQuantity,
  validateReturnLines,
} from '../validation';

describe('assertPositiveReturnQuantity', () => {
  it('requires positive return quantity', () => {
    const result = assertPositiveReturnQuantity({
      materialLabel: 'CEM-001',
      returnQuantity: 0,
      remainingBaseQuantity: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('greater than 0');
    }
  });

  it('blocks return above remaining issued quantity', () => {
    const result = assertPositiveReturnQuantity({
      materialLabel: 'CEM-001',
      returnQuantity: 12,
      remainingBaseQuantity: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('exceeds remaining');
      expect(result.message).toContain('10');
    }
  });

  it('allows positive return within remaining', () => {
    expect(
      assertPositiveReturnQuantity({
        materialLabel: 'CEM-001',
        returnQuantity: 5,
        remainingBaseQuantity: 10,
      }).ok,
    ).toBe(true);
  });

  it('allows return equal to remaining outstanding', () => {
    expect(
      assertPositiveReturnQuantity({
        materialLabel: 'CEM-001',
        returnQuantity: 10,
        remainingBaseQuantity: 10,
      }).ok,
    ).toBe(true);
  });
});

describe('validateReturnLines', () => {
  const baseLine = {
    materialId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    materialLabel: 'CEM-001',
    unit: 'bag',
    remainingBaseQuantity: 8,
    quantityText: '3',
    reason: 'Unused',
  };

  it('accepts valid lines and skips blank quantities', () => {
    const result = validateReturnLines([
      baseLine,
      { ...baseLine, materialId: 'bbbbbbbbbbbbbbbbbbbbbbbb', quantityText: '' },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.quantity).toBe(3);
    }
  });

  it('rejects when return exceeds outstanding', () => {
    const result = validateReturnLines([
      { ...baseLine, quantityText: '20' },
    ]);
    expect(result.ok).toBe(false);
  });

  it('requires at least one quantity', () => {
    const result = validateReturnLines([
      { ...baseLine, quantityText: '' },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/at least one/i);
    }
  });
});
