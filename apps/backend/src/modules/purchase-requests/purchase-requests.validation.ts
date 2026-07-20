import { BadRequestException } from '@nestjs/common';
import { convertToBaseUnit } from '../material-master/materials.validation';
import type {
  Material,
  MaterialUnit,
  UnitConversionFactor,
} from '../material-master/schemas/material.schema';

const HIGH_QTY_REORDER_MULTIPLIER = 3;
const HIGH_QTY_STOCK_MULTIPLIER = 5;

export type StockSnapshot = {
  currentStock: number;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
};

export function assertRequestedQuantity(qty: number): void {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new BadRequestException('requestedQuantity must be a number > 0');
  }
}

export function assertApprovedQuantity(
  approvedQuantity: number,
  requestedQuantity: number,
): void {
  if (!Number.isFinite(approvedQuantity) || approvedQuantity < 0) {
    throw new BadRequestException('approvedQuantity must be a number ≥ 0');
  }
  if (approvedQuantity - requestedQuantity > 1e-9) {
    throw new BadRequestException(
      'approvedQuantity cannot exceed requestedQuantity',
    );
  }
}

export function assertMaterialUnitAllowed(
  unit: MaterialUnit,
  material: Pick<Material, 'baseUnit' | 'alternateUnits'>,
): void {
  const allowed = new Set<MaterialUnit>([
    material.baseUnit,
    ...(material.alternateUnits ?? []),
  ]);
  if (!allowed.has(unit)) {
    throw new BadRequestException(
      `Unit ${unit} is not allowed for material (base=${material.baseUnit})`,
    );
  }
}

/**
 * Build warnings for unusually high requested qty relative to stock / reorder / max.
 * Quantities compared in base units.
 */
export function buildQuantityWarnings(input: {
  requestedQuantity: number;
  unit: MaterialUnit;
  baseUnit: MaterialUnit;
  conversionFactors: UnitConversionFactor[];
  currentStockInBase: number;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
}): string[] {
  assertRequestedQuantity(input.requestedQuantity);
  const qtyInBase = convertToBaseUnit(
    input.requestedQuantity,
    input.unit,
    input.baseUnit,
    input.conversionFactors,
  );

  const warnings: string[] = [];
  const reorderThreshold =
    Math.max(input.reorderLevel, input.minimumStock) * HIGH_QTY_REORDER_MULTIPLIER;

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

export function convertBaseToUnit(
  quantityInBase: number,
  toUnit: MaterialUnit,
  baseUnit: MaterialUnit,
  conversionFactors: UnitConversionFactor[],
): number {
  if (toUnit === baseUnit) return quantityInBase;
  const factor = conversionFactors.find((f) => f.unit === toUnit);
  if (!factor || factor.factorToBase <= 0) {
    throw new BadRequestException(
      `No conversion factor from base ${baseUnit} to ${toUnit}`,
    );
  }
  return quantityInBase / factor.factorToBase;
}

export { HIGH_QTY_REORDER_MULTIPLIER, HIGH_QTY_STOCK_MULTIPLIER };
