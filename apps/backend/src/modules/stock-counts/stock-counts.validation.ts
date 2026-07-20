import { BadRequestException } from '@nestjs/common';

export function roundQty(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

export function computeDifference(
  physicalQuantity: number,
  systemQuantity: number,
): number {
  return roundQty(physicalQuantity - systemQuantity);
}

export function isLargeVariance(input: {
  systemQuantity: number;
  difference: number;
  thresholdPercent: number;
}): boolean {
  const absDiff = Math.abs(input.difference);
  if (absDiff < 1e-9) return false;
  if (input.systemQuantity <= 1e-9) {
    // Any unexpected stock when system is zero is treated as large
    return absDiff > 0;
  }
  const pct = (absDiff / input.systemQuantity) * 100;
  return pct >= input.thresholdPercent;
}

export function assertDifferenceExplained(input: {
  difference: number;
  reason?: string | null;
}): void {
  if (Math.abs(input.difference) < 1e-9) return;
  if (!input.reason?.trim()) {
    throw new BadRequestException(
      'Stock difference requires an explanation (reason)',
    );
  }
}

export function assertPhysicalQuantity(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException('physicalQuantity must be ≥ 0');
  }
}

export function normalizeLocation(location?: string | null): string {
  return (location ?? '').trim();
}
