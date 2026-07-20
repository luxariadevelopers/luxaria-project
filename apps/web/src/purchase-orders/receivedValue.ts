/**
 * Received value is not a Nest header field. Open balance amount is estimated
 * from line open ratios (`estimateBalanceAmount`); received ≈ total − balance.
 */
export function computeReceivedAmount(
  total: number,
  balanceAmount: number,
): number {
  if (!Number.isFinite(total) || !Number.isFinite(balanceAmount)) {
    return 0;
  }
  const received = total - balanceAmount;
  if (received <= 0) return 0;
  return Math.round(received * 100) / 100;
}
