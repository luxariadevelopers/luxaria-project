import { z } from 'zod';
import type { PublicComparisonVendorRow } from './types';

/** Matches Nest `MIN_REASON_LENGTH` in quotation-comparisons.validation.ts. */
export const MIN_RECOMMENDATION_REASON_LENGTH = 10;

const MONEY_EPS = 0.005;

/**
 * Client preview of Nest lowest-landed-cost rule.
 * Server remains authoritative (400).
 */
export function isLowestLandedCostSelection(
  selected: Pick<PublicComparisonVendorRow, 'netLandedCost'>,
  lowest: Pick<PublicComparisonVendorRow, 'netLandedCost'>,
): boolean {
  return Math.abs(selected.netLandedCost - lowest.netLandedCost) < MONEY_EPS;
}

export function findLowestLandedCostVendor(
  vendors: readonly PublicComparisonVendorRow[],
): PublicComparisonVendorRow | null {
  if (vendors.length === 0) return null;
  return vendors.reduce((min, row) =>
    row.netLandedCost < min.netLandedCost ? row : min,
  );
}

/**
 * When the selected vendor is not the lowest net landed cost,
 * a substantive reason (≥10 chars) is required.
 */
export function assertRecommendationReason(input: {
  recommendedLandedCost: number;
  lowestLandedCost: number;
  reason?: string | null;
}):
  | { ok: true; isLowestVendorSelected: boolean; reason: string | null }
  | { ok: false; message: string } {
  const isLowest =
    Math.abs(input.recommendedLandedCost - input.lowestLandedCost) < MONEY_EPS;

  if (isLowest) {
    return {
      ok: true,
      isLowestVendorSelected: true,
      reason: input.reason?.trim() || null,
    };
  }

  const reason = input.reason?.trim() || '';
  if (reason.length < MIN_RECOMMENDATION_REASON_LENGTH) {
    return {
      ok: false,
      message: `Reason is required (min ${MIN_RECOMMENDATION_REASON_LENGTH} characters) when the lowest-cost vendor is not selected`,
    };
  }
  return { ok: true, isLowestVendorSelected: false, reason };
}

export const recommendFormSchema = z
  .object({
    quotationId: z.string().min(1, 'Select a vendor quotation'),
    reason: z.string().optional().nullable(),
    recommendedLandedCost: z.coerce.number(),
    lowestLandedCost: z.coerce.number(),
  })
  .superRefine((values, ctx) => {
    const checked = assertRecommendationReason({
      recommendedLandedCost: values.recommendedLandedCost,
      lowestLandedCost: values.lowestLandedCost,
      reason: values.reason,
    });
    if (!checked.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: checked.message,
        path: ['reason'],
      });
    }
  });

export type RecommendFormValues = z.infer<typeof recommendFormSchema>;
