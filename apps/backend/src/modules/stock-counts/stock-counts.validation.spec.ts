import { BadRequestException } from '@nestjs/common';
import {
  assertDifferenceExplained,
  computeDifference,
  isLargeVariance,
} from './stock-counts.validation';

describe('stock-counts.validation', () => {
  it('computes physical − system', () => {
    expect(computeDifference(90, 100)).toBe(-10);
    expect(computeDifference(105, 100)).toBe(5);
  });

  it('requires reason when there is a difference', () => {
    expect(() =>
      assertDifferenceExplained({ difference: -3, reason: null }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertDifferenceExplained({ difference: -3, reason: 'Damaged bags' }),
    ).not.toThrow();

    expect(() =>
      assertDifferenceExplained({ difference: 0, reason: null }),
    ).not.toThrow();
  });

  it('flags large variances by threshold percent', () => {
    expect(
      isLargeVariance({
        systemQuantity: 100,
        difference: -9,
        thresholdPercent: 10,
      }),
    ).toBe(false);

    expect(
      isLargeVariance({
        systemQuantity: 100,
        difference: -10,
        thresholdPercent: 10,
      }),
    ).toBe(true);

    expect(
      isLargeVariance({
        systemQuantity: 0,
        difference: 5,
        thresholdPercent: 10,
      }),
    ).toBe(true);
  });
});
