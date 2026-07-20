import {
  computeDifference,
  differenceRequiresReason,
  isLargeVariance,
} from '../variance';

describe('stock-count variance', () => {
  it('computes physical − system', () => {
    expect(computeDifference(95, 100)).toBe(-5);
    expect(computeDifference(110, 100)).toBe(10);
  });

  it('requires reason for non-zero difference', () => {
    expect(differenceRequiresReason(0)).toBe(false);
    expect(differenceRequiresReason(-1e-10)).toBe(false);
    expect(differenceRequiresReason(-5)).toBe(true);
  });

  it('flags large variance at default 10%', () => {
    expect(
      isLargeVariance({ systemQuantity: 100, difference: -5 }),
    ).toBe(false);
    expect(
      isLargeVariance({ systemQuantity: 100, difference: -10 }),
    ).toBe(true);
    expect(
      isLargeVariance({ systemQuantity: 0, difference: 1 }),
    ).toBe(true);
  });
});
