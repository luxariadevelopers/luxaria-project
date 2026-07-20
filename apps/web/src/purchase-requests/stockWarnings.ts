import type { MaterialUnit, UnitConversionFactor } from './types';

/** Matches Nest `HIGH_QTY_REORDER_MULTIPLIER` / `HIGH_QTY_STOCK_MULTIPLIER`. */
export const HIGH_QTY_REORDER_MULTIPLIER = 3;
export const HIGH_QTY_STOCK_MULTIPLIER = 5;

/**
 * Client mirror of Nest `convertToBaseUnit` (materials.validation).
 * Returns null when conversion cannot be resolved (Nest would 400).
 */
export function convertToBaseUnit(
  quantity: number,
  fromUnit: MaterialUnit,
  baseUnit: MaterialUnit,
  conversionFactors: readonly UnitConversionFactor[],
): number | null {
  if (!Number.isFinite(quantity)) return null;
  if (fromUnit === baseUnit) return quantity;
  const factor = conversionFactors.find((f) => f.unit === fromUnit);
  if (!factor || factor.factorToBase <= 0) return null;
  return quantity * factor.factorToBase;
}

/**
 * Client preview of Nest `buildQuantityWarnings`.
 * Quantities compared in base units. Server remains authoritative on submit.
 */
export function buildQuantityWarnings(input: {
  requestedQuantity: number;
  unit: MaterialUnit;
  baseUnit: MaterialUnit;
  conversionFactors: readonly UnitConversionFactor[];
  currentStockInBase: number;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
}): string[] {
  if (
    !Number.isFinite(input.requestedQuantity) ||
    input.requestedQuantity <= 0
  ) {
    return [];
  }

  const qtyInBase = convertToBaseUnit(
    input.requestedQuantity,
    input.unit,
    input.baseUnit,
    input.conversionFactors,
  );
  if (qtyInBase == null) return [];

  const warnings: string[] = [];
  const reorderThreshold =
    Math.max(input.reorderLevel, input.minimumStock) *
    HIGH_QTY_REORDER_MULTIPLIER;

  if (reorderThreshold > 0 && qtyInBase > reorderThreshold) {
    warnings.push(
      `Requested quantity (${qtyInBase} ${input.baseUnit}) is unusually high versus reorder/minimum levels (${reorderThreshold} ${input.baseUnit})`,
    );
  }

  if (input.maximumStock > 0 && qtyInBase > input.maximumStock) {
    warnings.push(
      `Requested quantity exceeds maximum stock level (${input.maximumStock} ${input.baseUnit})`,
    );
  }

  if (
    input.currentStockInBase > 0 &&
    qtyInBase > input.currentStockInBase * HIGH_QTY_STOCK_MULTIPLIER
  ) {
    warnings.push(
      `Requested quantity is more than ${HIGH_QTY_STOCK_MULTIPLIER}× current stock (${input.currentStockInBase} ${input.baseUnit})`,
    );
  }

  if (
    input.currentStockInBase >= input.reorderLevel &&
    input.reorderLevel > 0 &&
    qtyInBase > 0
  ) {
    warnings.push(
      `Current stock (${input.currentStockInBase} ${input.baseUnit}) is already at/above reorder level (${input.reorderLevel})`,
    );
  }

  return warnings;
}

/**
 * Display current stock in the line unit (Nest `convertBaseToUnit` mirror).
 */
export function convertBaseToUnit(
  quantityInBase: number,
  toUnit: MaterialUnit,
  baseUnit: MaterialUnit,
  conversionFactors: readonly UnitConversionFactor[],
): number | null {
  if (!Number.isFinite(quantityInBase)) return null;
  if (toUnit === baseUnit) return quantityInBase;
  const factor = conversionFactors.find((f) => f.unit === toUnit);
  if (!factor || factor.factorToBase <= 0) return null;
  return quantityInBase / factor.factorToBase;
}
