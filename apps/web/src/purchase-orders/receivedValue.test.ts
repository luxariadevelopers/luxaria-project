import { describe, expect, it } from 'vitest';
import { computeReceivedAmount } from './receivedValue';

describe('computeReceivedAmount', () => {
  it('returns total minus open balance', () => {
    expect(computeReceivedAmount(100_000, 40_000)).toBe(60_000);
  });

  it('floors at zero when balance exceeds total', () => {
    expect(computeReceivedAmount(100, 150)).toBe(0);
  });

  it('returns zero for non-finite inputs', () => {
    expect(computeReceivedAmount(Number.NaN, 10)).toBe(0);
    expect(computeReceivedAmount(10, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
