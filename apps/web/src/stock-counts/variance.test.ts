import { describe, expect, it } from 'vitest';
import {
  buildAdjustmentPreview,
  computeDifference,
  differenceRequiresReason,
  isLargeVariance,
} from './variance';

describe('stock count variance thresholds', () => {
  it('flags large variances at default 10% of system qty', () => {
    expect(
      isLargeVariance({
        systemQuantity: 100,
        difference: -10,
        thresholdPercent: 10,
      }),
    ).toBe(true);
    expect(
      isLargeVariance({
        systemQuantity: 100,
        difference: -9,
        thresholdPercent: 10,
      }),
    ).toBe(false);
  });

  it('treats any unexpected stock when system is zero as large', () => {
    expect(
      isLargeVariance({
        systemQuantity: 0,
        difference: 1,
        thresholdPercent: 10,
      }),
    ).toBe(true);
  });

  it('requires a reason for non-zero difference', () => {
    expect(differenceRequiresReason(computeDifference(95, 100))).toBe(true);
    expect(differenceRequiresReason(0)).toBe(false);
  });

  it('builds adjustment preview for posting (qty in/out)', () => {
    const preview = buildAdjustmentPreview([
      {
        materialId: 'm1',
        materialCode: 'CEM',
        materialName: 'Cement',
        baseUnit: 'bag',
        systemQuantity: 100,
        physicalQuantity: 90,
        reason: 'Damaged bags',
      },
      {
        materialId: 'm2',
        baseUnit: 'bag',
        systemQuantity: 50,
        physicalQuantity: 50,
        reason: null,
      },
    ]);
    expect(preview).toHaveLength(1);
    expect(preview[0]?.quantityOut).toBe(10);
    expect(preview[0]?.quantityIn).toBe(0);
    expect(preview[0]?.isLargeVariance).toBe(true);
  });
});
