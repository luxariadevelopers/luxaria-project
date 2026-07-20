import { roundMoney } from '@/validation';

/**
 * Line estimated amount — Nest mapper:
 * `estimatedRate * requestedQuantity` (null when rate missing).
 */
export function lineEstimatedAmount(
  requestedQuantity: number,
  estimatedRate: number | null | undefined,
): number | null {
  if (estimatedRate == null || !Number.isFinite(estimatedRate)) {
    return null;
  }
  if (!Number.isFinite(requestedQuantity)) {
    return null;
  }
  return roundMoney(estimatedRate * requestedQuantity);
}

/**
 * Header estimated total — Nest mapper sums line amounts (missing rate = 0).
 */
export function sumEstimatedTotal(
  items: ReadonlyArray<{
    requestedQuantity: number;
    estimatedRate?: number | null;
  }>,
): number {
  const total = items.reduce((sum, item) => {
    const amount = lineEstimatedAmount(
      item.requestedQuantity,
      item.estimatedRate,
    );
    return sum + (amount ?? 0);
  }, 0);
  return roundMoney(total);
}
