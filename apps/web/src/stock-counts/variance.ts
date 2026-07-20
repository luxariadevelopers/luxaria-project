import {
  DEFAULT_STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT,
} from './types';

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

/**
 * Nest `isLargeVariance` — absolute % of system qty ≥ threshold
 * (default `STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT` = 10).
 * Any non-zero stock when system is zero is treated as large.
 */
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

export function differenceRequiresReason(difference: number): boolean {
  return Math.abs(difference) >= 1e-9;
}

export type AdjustmentPreviewLine = {
  materialId: string;
  materialLabel: string;
  difference: number;
  baseUnit: string;
  reason: string | null;
  isLargeVariance: boolean;
  quantityIn: number;
  quantityOut: number;
};

/** Preview of ledger `adjustment` rows Nest posts on `POST …/post`. */
export function buildAdjustmentPreview(
  items: readonly {
    materialId: string;
    materialCode?: string | null;
    materialName?: string | null;
    baseUnit: string;
    systemQuantity: number;
    physicalQuantity: number;
    reason?: string | null;
  }[],
  thresholdPercent = DEFAULT_STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT,
): AdjustmentPreviewLine[] {
  const lines: AdjustmentPreviewLine[] = [];
  for (const item of items) {
    const difference = computeDifference(
      item.physicalQuantity,
      item.systemQuantity,
    );
    if (Math.abs(difference) < 1e-9) continue;
    const abs = Math.abs(difference);
    const isSurplus = difference > 0;
    lines.push({
      materialId: item.materialId,
      materialLabel:
        [item.materialCode, item.materialName].filter(Boolean).join(' · ') ||
        item.materialId,
      difference,
      baseUnit: item.baseUnit,
      reason: item.reason?.trim() ? item.reason.trim() : null,
      isLargeVariance: isLargeVariance({
        systemQuantity: item.systemQuantity,
        difference,
        thresholdPercent,
      }),
      quantityIn: isSurplus ? abs : 0,
      quantityOut: isSurplus ? 0 : abs,
    });
  }
  return lines;
}
