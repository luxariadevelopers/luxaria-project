import { describe, expect, it } from 'vitest';
import { assertBaseUnitClear, formatBaseQuantity } from './units';

describe('formatBaseQuantity', () => {
  it('labels quantity as base unit', () => {
    expect(formatBaseQuantity(120.5, 'kilogram')).toBe('120.5 kg (base)');
    expect(formatBaseQuantity(10, 'bag')).toBe('10 bag (base)');
  });
});

describe('assertBaseUnitClear', () => {
  it('requires base unit and finite quantity', () => {
    expect(
      assertBaseUnitClear({ quantityInBaseUnit: 1, baseUnit: 'ton' }).ok,
    ).toBe(true);
    expect(
      assertBaseUnitClear({ quantityInBaseUnit: 1, baseUnit: '' }).ok,
    ).toBe(false);
    expect(
      assertBaseUnitClear({ quantityInBaseUnit: 1, baseUnit: null }).ok,
    ).toBe(false);
    expect(
      assertBaseUnitClear({
        quantityInBaseUnit: Number.NaN,
        baseUnit: 'kilogram',
      }).ok,
    ).toBe(false);
  });
});
