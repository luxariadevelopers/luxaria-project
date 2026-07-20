import { describe, expect, it } from 'vitest';
import { computeAllocationTotals, remainingOnDemandLine } from './allocation';

describe('computeAllocationTotals', () => {
  it('supports unallocated advance when allocations < amount', () => {
    const totals = computeAllocationTotals({
      amount: 500_000,
      allocations: [{ amount: 200_000 }, { amount: 100_000 }],
    });
    expect(totals.ok).toBe(true);
    if (!totals.ok) return;
    expect(totals.allocatedAmount).toBe(300_000);
    expect(totals.unallocatedAmount).toBe(200_000);
  });

  it('rejects over-allocation beyond receipt amount', () => {
    const totals = computeAllocationTotals({
      amount: 100_000,
      allocations: [{ amount: 120_000 }],
    });
    expect(totals.ok).toBe(false);
    if (totals.ok) return;
    expect(totals.message).toMatch(/cannot exceed receipt amount/i);
  });
});

describe('remainingOnDemandLine', () => {
  it('subtracts collected from amount + tax', () => {
    expect(
      remainingOnDemandLine({
        amount: 100_000,
        tax: 5_000,
        collectedAmount: 40_000,
      }),
    ).toBe(65_000);
  });
});
