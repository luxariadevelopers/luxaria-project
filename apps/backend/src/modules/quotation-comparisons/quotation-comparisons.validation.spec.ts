import { BadRequestException } from '@nestjs/common';
import {
  assertRecommendationReason,
  computeBaseMaterialRate,
  computeGst,
  computeTotalDiscount,
  MIN_REASON_LENGTH,
} from './quotation-comparisons.validation';

describe('quotation-comparisons.validation', () => {
  it('computes weighted average base material rate', () => {
    expect(
      computeBaseMaterialRate([
        { quantity: 10, rate: 100 },
        { quantity: 30, rate: 200 },
      ]),
    ).toBe(175);
  });

  it('aggregates GST and discounts', () => {
    expect(
      computeGst({ lineTaxes: [50, 25], headerTaxes: 10 }),
    ).toBe(85);
    expect(
      computeTotalDiscount({ lineDiscounts: [20, 5], headerDiscount: 15 }),
    ).toBe(40);
  });

  it('allows recommendation without reason when lowest cost selected', () => {
    const result = assertRecommendationReason({
      recommendedLandedCost: 1000,
      lowestLandedCost: 1000,
      reason: null,
    });
    expect(result.isLowestVendorSelected).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('requires reason when lowest vendor is not selected', () => {
    expect(() =>
      assertRecommendationReason({
        recommendedLandedCost: 1200,
        lowestLandedCost: 1000,
        reason: 'short',
      }),
    ).toThrow(new RegExp(String(MIN_REASON_LENGTH)));

    expect(() =>
      assertRecommendationReason({
        recommendedLandedCost: 1200,
        lowestLandedCost: 1000,
        reason: null,
      }),
    ).toThrow(BadRequestException);

    const ok = assertRecommendationReason({
      recommendedLandedCost: 1200,
      lowestLandedCost: 1000,
      reason: 'Better quality history and on-time delivery',
    });
    expect(ok.isLowestVendorSelected).toBe(false);
    expect(ok.reason).toContain('Better quality');
  });
});
