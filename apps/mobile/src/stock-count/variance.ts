import { DEFAULT_STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT } from './types';

export function roundQty(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

/** Nest `computeDifference` — physical − system (signed, base unit). */
export function computeDifference(
  physicalQuantity: number,
  systemQuantity: number,
): number {
  return roundQty(physicalQuantity - systemQuantity);
}

export function differenceRequiresReason(difference: number): boolean {
  return Math.abs(difference) >= 1e-9;
}

export function isLargeVariance(input: {
  systemQuantity: number;
  difference: number;
  thresholdPercent?: number;
}): boolean {
  const threshold =
    input.thresholdPercent ?? DEFAULT_STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT;
  const absDiff = Math.abs(input.difference);
  if (absDiff < 1e-9) return false;
  if (input.systemQuantity <= 1e-9) {
    return absDiff > 0;
  }
  const pct = (absDiff / input.systemQuantity) * 100;
  return pct >= threshold;
}
