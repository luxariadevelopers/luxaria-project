import { BadRequestException } from '@nestjs/common';

const MIN_REASON_LENGTH = 10;

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundRate(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function assertScoreOptional(
  value: number | null | undefined,
  field: string,
): void {
  if (value == null) return;
  if (!Number.isFinite(value) || value < 0 || value > 5) {
    throw new BadRequestException(`${field} must be between 0 and 5`);
  }
}

/**
 * Weighted average base material rate = Σ(qty × rate) / Σ(qty).
 */
export function computeBaseMaterialRate(
  items: Array<{ quantity: number; rate: number }>,
): number {
  let qtySum = 0;
  let amountSum = 0;
  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new BadRequestException('Item quantity must be > 0');
    }
    if (!Number.isFinite(item.rate) || item.rate < 0) {
      throw new BadRequestException('Item rate must be ≥ 0');
    }
    qtySum += item.quantity;
    amountSum += item.quantity * item.rate;
  }
  if (qtySum <= 0) {
    throw new BadRequestException('Cannot compute base rate without quantities');
  }
  return roundRate(amountSum / qtySum);
}

export function computeGst(input: {
  lineTaxes: number[];
  headerTaxes: number;
}): number {
  const lineGst = input.lineTaxes.reduce((sum, t) => sum + (t || 0), 0);
  return roundMoney(lineGst + (input.headerTaxes || 0));
}

export function computeTotalDiscount(input: {
  lineDiscounts: number[];
  headerDiscount: number;
}): number {
  const line = input.lineDiscounts.reduce((sum, d) => sum + (d || 0), 0);
  return roundMoney(line + (input.headerDiscount || 0));
}

/**
 * When recommending a vendor that is not the lowest net landed cost,
 * a substantive reason is required.
 */
export function assertRecommendationReason(input: {
  recommendedLandedCost: number;
  lowestLandedCost: number;
  reason?: string | null;
}): { isLowestVendorSelected: boolean; reason: string | null } {
  const isLowest =
    Math.abs(input.recommendedLandedCost - input.lowestLandedCost) < 0.005;

  if (isLowest) {
    return {
      isLowestVendorSelected: true,
      reason: input.reason?.trim() || null,
    };
  }

  const reason = input.reason?.trim() || '';
  if (reason.length < MIN_REASON_LENGTH) {
    throw new BadRequestException(
      `Reason is required (min ${MIN_REASON_LENGTH} characters) when the lowest-cost vendor is not selected`,
    );
  }
  return { isLowestVendorSelected: false, reason };
}

export { MIN_REASON_LENGTH };
