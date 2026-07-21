import { BadRequestException } from '@nestjs/common';

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function normalizeDay(value: string | Date, field: string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
}

export function assertPeriodRange(periodFrom: Date, periodTo: Date): void {
  if (periodTo.getTime() < periodFrom.getTime()) {
    throw new BadRequestException('periodTo must be on or after periodFrom');
  }
}

/**
 * Quantity resolution for MB lines:
 * 1. `formulaQuantity` wins when provided
 * 2. Else L×B×H×nos (missing dims → 1) when any dim / units path is used
 * 3. Else explicit `quantity` override
 */
export function resolveMbQuantity(input: {
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  numberOfUnits?: number | null;
  formulaQuantity?: number | null;
  quantity?: number | null;
}): { calculatedQuantity: number; quantity: number } {
  const units = input.numberOfUnits ?? 1;
  assertNonNegative(units, 'numberOfUnits');
  if (units <= 0) {
    throw new BadRequestException('numberOfUnits must be > 0');
  }

  const hasDim =
    input.length != null || input.breadth != null || input.height != null;

  let calculatedQuantity = 0;
  if (hasDim) {
    if (input.length != null) assertNonNegative(input.length, 'length');
    if (input.breadth != null) assertNonNegative(input.breadth, 'breadth');
    if (input.height != null) assertNonNegative(input.height, 'height');
    const L = input.length ?? 1;
    const B = input.breadth ?? 1;
    const H = input.height ?? 1;
    calculatedQuantity = roundQty(L * B * H * units);
  } else if (input.formulaQuantity == null && input.quantity == null) {
    // Nos-only quantity (e.g. count items)
    calculatedQuantity = roundQty(units);
  }

  if (input.formulaQuantity != null) {
    assertNonNegative(input.formulaQuantity, 'formulaQuantity');
    return {
      calculatedQuantity,
      quantity: roundQty(input.formulaQuantity),
    };
  }

  if (input.quantity != null) {
    assertNonNegative(input.quantity, 'quantity');
    return {
      calculatedQuantity:
        calculatedQuantity > 0 ? calculatedQuantity : roundQty(input.quantity),
      quantity: roundQty(input.quantity),
    };
  }

  if (calculatedQuantity <= 0) {
    throw new BadRequestException(
      'Provide L/B/H dimensions, formulaQuantity, or quantity',
    );
  }

  return { calculatedQuantity, quantity: calculatedQuantity };
}
