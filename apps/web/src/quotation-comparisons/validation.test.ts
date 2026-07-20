import { describe, expect, it } from 'vitest';
import type { PublicComparisonVendorRow } from './types';
import {
  assertRecommendationReason,
  findLowestLandedCostVendor,
  isLowestLandedCostSelection,
  MIN_RECOMMENDATION_REASON_LENGTH,
  recommendFormSchema,
} from './validation';

function vendor(
  partial: Partial<PublicComparisonVendorRow> &
    Pick<PublicComparisonVendorRow, 'quotationId' | 'netLandedCost'>,
): PublicComparisonVendorRow {
  return {
    id: partial.id ?? partial.quotationId,
    quotationNumber: 'VQ-1',
    vendorId: 'v1',
    vendorCode: 'VEN-1',
    vendorName: 'Vendor One',
    baseMaterialRate: 100,
    gst: 18,
    freight: 0,
    discount: 0,
    deliveryDays: 7,
    paymentTerms: 'Net 30',
    vendorRating: 4,
    previousQuality: null,
    previousDeliveryPerformance: null,
    isLowestLandedCost: false,
    isRecommended: false,
    ...partial,
  };
}

describe('lowest-vendor rule', () => {
  it('identifies lowest landed cost vendor', () => {
    const rows = [
      vendor({ quotationId: 'a', netLandedCost: 1200 }),
      vendor({ quotationId: 'b', netLandedCost: 1000 }),
      vendor({ quotationId: 'c', netLandedCost: 1100 }),
    ];
    expect(findLowestLandedCostVendor(rows)?.quotationId).toBe('b');
  });

  it('treats equal costs as lowest selection', () => {
    expect(
      isLowestLandedCostSelection(
        { netLandedCost: 1000 },
        { netLandedCost: 1000 },
      ),
    ).toBe(true);
    expect(
      isLowestLandedCostSelection(
        { netLandedCost: 1000.002 },
        { netLandedCost: 1000 },
      ),
    ).toBe(true);
  });

  it('allows recommendation without reason when lowest cost selected', () => {
    const result = assertRecommendationReason({
      recommendedLandedCost: 1000,
      lowestLandedCost: 1000,
      reason: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.isLowestVendorSelected).toBe(true);
      expect(result.reason).toBeNull();
    }
  });

  it('requires reason when lowest vendor is not selected', () => {
    const short = assertRecommendationReason({
      recommendedLandedCost: 1200,
      lowestLandedCost: 1000,
      reason: 'short',
    });
    expect(short.ok).toBe(false);
    if (!short.ok) {
      expect(short.message).toMatch(String(MIN_RECOMMENDATION_REASON_LENGTH));
    }

    const missing = assertRecommendationReason({
      recommendedLandedCost: 1200,
      lowestLandedCost: 1000,
      reason: null,
    });
    expect(missing.ok).toBe(false);

    const ok = assertRecommendationReason({
      recommendedLandedCost: 1200,
      lowestLandedCost: 1000,
      reason: 'Better quality history and on-time delivery',
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.isLowestVendorSelected).toBe(false);
      expect(ok.reason).toContain('Better quality');
    }
  });

  it('zod schema blocks non-lowest without reason', () => {
    const bad = recommendFormSchema.safeParse({
      quotationId: 'q2',
      reason: '',
      recommendedLandedCost: 1500,
      lowestLandedCost: 1000,
    });
    expect(bad.success).toBe(false);

    const good = recommendFormSchema.safeParse({
      quotationId: 'q2',
      reason: 'Prior GRN quality and shorter delivery window',
      recommendedLandedCost: 1500,
      lowestLandedCost: 1000,
    });
    expect(good.success).toBe(true);
  });
});
