import { roundMoney } from '@/validation';

/**
 * Sum of requirement line amounts (2 dp), matching Nest `sumItems`.
 * Nest requires the total to be greater than zero.
 */
export function sumRequirementItemAmounts(
  items: ReadonlyArray<{ estimatedAmount: number }>,
): number {
  const total = items.reduce((sum, item) => {
    const amount = Number(item.estimatedAmount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  return roundMoney(total);
}

/**
 * Client preview: requested total must equal the sum of positive item amounts.
 * Nest remains authoritative.
 */
export function assertRequestedTotalConsistent(
  items: ReadonlyArray<{ estimatedAmount: number }>,
  requestedTotal?: number,
): { ok: true; total: number } | { ok: false; message: string; total: number } {
  const total = sumRequirementItemAmounts(items);
  if (total <= 0) {
    return {
      ok: false,
      total,
      message: 'Requested total must be greater than zero.',
    };
  }
  if (
    requestedTotal != null &&
    Number.isFinite(requestedTotal) &&
    Math.abs(roundMoney(requestedTotal) - total) >= 0.005
  ) {
    return {
      ok: false,
      total,
      message: `Requested total (${requestedTotal}) does not match item sum (${total}).`,
    };
  }
  return { ok: true, total };
}
