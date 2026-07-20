import { BadRequestException } from '@nestjs/common';
import {
  MaterialUnit,
  type UnitConversionFactor,
} from './schemas/material.schema';

const CATEGORY_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MONEY_EPS = 1e-9;

export function assertMaterialCategory(category: string): string {
  const normalized = category.trim().toLowerCase();
  if (!CATEGORY_REGEX.test(normalized)) {
    throw new BadRequestException(
      'category must be lowercase alphanumeric with optional _ or -',
    );
  }
  return normalized;
}

export function assertUnitConversions(input: {
  baseUnit: MaterialUnit;
  alternateUnits?: MaterialUnit[] | null;
  conversionFactors?: UnitConversionFactor[] | null;
}): {
  alternateUnits: MaterialUnit[];
  conversionFactors: UnitConversionFactor[];
} {
  const baseUnit = input.baseUnit;
  if (!Object.values(MaterialUnit).includes(baseUnit)) {
    throw new BadRequestException('Invalid baseUnit');
  }

  const alternateUnits = [...new Set(input.alternateUnits ?? [])];
  if (alternateUnits.includes(baseUnit)) {
    throw new BadRequestException(
      'baseUnit cannot appear in alternateUnits',
    );
  }

  for (const unit of alternateUnits) {
    if (!Object.values(MaterialUnit).includes(unit)) {
      throw new BadRequestException(`Invalid alternate unit: ${unit}`);
    }
  }

  const factors = input.conversionFactors ?? [];
  const factorByUnit = new Map<MaterialUnit, number>();

  for (const factor of factors) {
    if (!Object.values(MaterialUnit).includes(factor.unit)) {
      throw new BadRequestException(`Invalid conversion unit: ${factor.unit}`);
    }
    if (factor.unit === baseUnit) {
      throw new BadRequestException(
        'conversionFactors must not include the baseUnit (implicit factor 1)',
      );
    }
    if (
      typeof factor.factorToBase !== 'number' ||
      !Number.isFinite(factor.factorToBase) ||
      factor.factorToBase <= MONEY_EPS
    ) {
      throw new BadRequestException(
        `conversion factor for ${factor.unit} must be a finite number > 0`,
      );
    }
    if (factorByUnit.has(factor.unit)) {
      throw new BadRequestException(
        `Duplicate conversion factor for unit ${factor.unit}`,
      );
    }
    factorByUnit.set(factor.unit, factor.factorToBase);
  }

  for (const unit of alternateUnits) {
    if (!factorByUnit.has(unit)) {
      throw new BadRequestException(
        `Missing conversion factor for alternate unit ${unit}`,
      );
    }
  }

  for (const unit of factorByUnit.keys()) {
    if (!alternateUnits.includes(unit)) {
      throw new BadRequestException(
        `conversionFactors includes ${unit} which is not in alternateUnits`,
      );
    }
  }

  return {
    alternateUnits,
    conversionFactors: alternateUnits.map((unit) => ({
      unit,
      factorToBase: factorByUnit.get(unit)!,
    })),
  };
}

export function assertStockLevels(input: {
  minimumStock?: number | null;
  reorderLevel?: number | null;
  maximumStock?: number | null;
}): void {
  const min = input.minimumStock ?? 0;
  const reorder = input.reorderLevel ?? 0;
  const max = input.maximumStock ?? 0;

  for (const [label, value] of [
    ['minimumStock', min],
    ['reorderLevel', reorder],
    ['maximumStock', max],
  ] as const) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`${label} must be a non-negative number`);
    }
  }

  if (min - reorder > MONEY_EPS) {
    throw new BadRequestException(
      'minimumStock cannot be greater than reorderLevel',
    );
  }
  if (reorder - max > MONEY_EPS && max > MONEY_EPS) {
    throw new BadRequestException(
      'reorderLevel cannot be greater than maximumStock when maximumStock is set',
    );
  }
  if (min - max > MONEY_EPS && max > MONEY_EPS) {
    throw new BadRequestException(
      'minimumStock cannot be greater than maximumStock when maximumStock is set',
    );
  }
}

export function assertWastagePercentage(value?: number | null): void {
  if (value == null) return;
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new BadRequestException(
      'standardWastagePercentage must be between 0 and 100',
    );
  }
}

export function assertStandardRate(value?: number | null): void {
  if (value == null) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException('standardRate cannot be negative');
  }
}

/**
 * Convert a quantity in `fromUnit` into base units using material conversions.
 */
export function convertToBaseUnit(
  quantity: number,
  fromUnit: MaterialUnit,
  baseUnit: MaterialUnit,
  conversionFactors: UnitConversionFactor[],
): number {
  if (!Number.isFinite(quantity)) {
    throw new BadRequestException('quantity must be a finite number');
  }
  if (fromUnit === baseUnit) {
    return quantity;
  }
  const factor = conversionFactors.find((f) => f.unit === fromUnit);
  if (!factor) {
    throw new BadRequestException(
      `No conversion factor from ${fromUnit} to base unit ${baseUnit}`,
    );
  }
  return quantity * factor.factorToBase;
}

export { CATEGORY_REGEX };
