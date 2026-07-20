import { materialUnitLabel } from './labels';
import type { MaterialUnit } from './types';

/**
 * Format an on-hand quantity that is already in base units.
 * Always appends "(base)" so display/alternate units are never implied.
 */
export function formatBaseQuantity(
  quantityInBaseUnit: number,
  baseUnit: MaterialUnit | string,
): string {
  const qty = Number.isFinite(quantityInBaseUnit)
    ? formatQtyNumber(quantityInBaseUnit)
    : '—';
  return `${qty} ${materialUnitLabel(baseUnit)} (base)`;
}

export function formatQtyNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  // Stock qtys keep up to 3 decimal places (Nest rounds similarly); no locale grouping.
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

/**
 * Guard: table quantities must carry an explicit base unit.
 * Rejects missing/blank unit so UI never shows a bare number as "display" qty.
 */
export function assertBaseUnitClear(input: {
  quantityInBaseUnit: number;
  baseUnit: MaterialUnit | string | null | undefined;
}): { ok: true } | { ok: false; message: string } {
  if (input.baseUnit == null || String(input.baseUnit).trim() === '') {
    return {
      ok: false,
      message: 'Base unit is required; quantity cannot be shown without a unit',
    };
  }
  if (!Number.isFinite(input.quantityInBaseUnit)) {
    return {
      ok: false,
      message: 'Quantity in base unit must be a finite number',
    };
  }
  return { ok: true };
}
