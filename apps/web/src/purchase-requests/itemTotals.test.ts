import { describe, expect, it } from 'vitest';
import { lineEstimatedAmount, sumEstimatedTotal } from './itemTotals';
import { MaterialUnit, PurchaseRequestPriority } from './types';
import { purchaseRequestFormSchema } from './validation';

describe('lineEstimatedAmount', () => {
  it('multiplies qty × rate to 2 dp', () => {
    expect(lineEstimatedAmount(10, 38.555)).toBe(385.55);
  });

  it('returns null when rate is missing', () => {
    expect(lineEstimatedAmount(10, null)).toBeNull();
    expect(lineEstimatedAmount(10, undefined)).toBeNull();
  });
});

describe('sumEstimatedTotal', () => {
  it('sums line amounts and treats missing rates as zero', () => {
    expect(
      sumEstimatedTotal([
        { requestedQuantity: 10, estimatedRate: 100 },
        { requestedQuantity: 2, estimatedRate: 50.5 },
        { requestedQuantity: 5, estimatedRate: null },
      ]),
    ).toBe(1101);
  });

  it('returns 0 for empty items', () => {
    expect(sumEstimatedTotal([])).toBe(0);
  });
});

describe('purchaseRequestFormSchema quantities', () => {
  const base = {
    projectId: '507f1f77bcf86cd799439011',
    requiredByDate: '2026-08-15',
    priority: PurchaseRequestPriority.Normal,
    justification: 'Foundation pour scheduled next week',
  };

  it('accepts positive quantities with required-by date', () => {
    const parsed = purchaseRequestFormSchema.safeParse({
      ...base,
      items: [
        {
          materialId: '507f1f77bcf86cd799439012',
          requestedQuantity: 100,
          unit: MaterialUnit.Bag,
          estimatedRate: 380,
          boqItemId: null,
          remarks: null,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects zero or negative quantities', () => {
    const parsed = purchaseRequestFormSchema.safeParse({
      ...base,
      items: [
        {
          materialId: '507f1f77bcf86cd799439012',
          requestedQuantity: 0,
          unit: MaterialUnit.Bag,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects missing required-by date', () => {
    const parsed = purchaseRequestFormSchema.safeParse({
      ...base,
      requiredByDate: '',
      items: [
        {
          materialId: '507f1f77bcf86cd799439012',
          requestedQuantity: 10,
          unit: MaterialUnit.Kilogram,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
