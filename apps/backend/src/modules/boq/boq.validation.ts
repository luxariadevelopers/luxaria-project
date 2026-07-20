import { BadRequestException } from '@nestjs/common';
import { BoqUnit } from './schemas/boq.schema';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundQty(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

export function normalizeCode(value: string, field: string): string {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    throw new BadRequestException(`${field} is required`);
  }
  return normalized;
}

export function parseBoqUnit(value: string): BoqUnit {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, '_');
  const aliases: Record<string, BoqUnit> = {
    nos: BoqUnit.Number,
    no: BoqUnit.Number,
    number: BoqUnit.Number,
    bag: BoqUnit.Bag,
    kg: BoqUnit.Kilogram,
    kilogram: BoqUnit.Kilogram,
    ton: BoqUnit.Ton,
    tonne: BoqUnit.Ton,
    litre: BoqUnit.Litre,
    liter: BoqUnit.Litre,
    m: BoqUnit.Metre,
    metre: BoqUnit.Metre,
    meter: BoqUnit.Metre,
    sqft: BoqUnit.SquareFoot,
    square_foot: BoqUnit.SquareFoot,
    cft: BoqUnit.CubicFoot,
    cubic_foot: BoqUnit.CubicFoot,
    sqm: BoqUnit.SquareMetre,
    square_metre: BoqUnit.SquareMetre,
    square_meter: BoqUnit.SquareMetre,
    cum: BoqUnit.CubicMetre,
    cubic_metre: BoqUnit.CubicMetre,
    cubic_meter: BoqUnit.CubicMetre,
    rmt: BoqUnit.RunningMetre,
    running_metre: BoqUnit.RunningMetre,
    load: BoqUnit.Load,
    box: BoqUnit.Box,
    job: BoqUnit.Job,
    day: BoqUnit.Day,
    ls: BoqUnit.LumpSum,
    lump_sum: BoqUnit.LumpSum,
  };
  const unit = aliases[normalized];
  if (!unit) {
    throw new BadRequestException(`Unsupported BOQ unit: ${value}`);
  }
  return unit;
}

export function computePlannedRate(input: {
  materialCost: number;
  labourCost: number;
  subcontractCost: number;
  otherCost: number;
}): number {
  return roundMoney(
    input.materialCost +
      input.labourCost +
      input.subcontractCost +
      input.otherCost,
  );
}

export function computePlannedValue(
  plannedQuantity: number,
  plannedRate: number,
): number {
  return roundMoney(plannedQuantity * plannedRate);
}

export type BoqTotalsInput = {
  materialCost: number;
  labourCost: number;
  subcontractCost: number;
  otherCost: number;
  plannedQuantity: number;
  plannedRate: number;
  plannedValue: number;
};

export type BoqTotalsValidation = {
  valid: boolean;
  expectedPlannedRate: number;
  expectedPlannedValue: number;
  rateVariance: number;
  valueVariance: number;
  errors: string[];
};

export function validateBoqItemTotals(
  input: BoqTotalsInput,
  tolerance = 0.005,
): BoqTotalsValidation {
  const expectedPlannedRate = computePlannedRate(input);
  const expectedPlannedValue = computePlannedValue(
    input.plannedQuantity,
    roundMoney(input.plannedRate),
  );
  const rateVariance = roundMoney(input.plannedRate - expectedPlannedRate);
  const valueVariance = roundMoney(input.plannedValue - expectedPlannedValue);
  const errors: string[] = [];

  if (Math.abs(rateVariance) > tolerance) {
    errors.push(
      `plannedRate (${input.plannedRate}) must equal material + labour + subcontract + other (${expectedPlannedRate})`,
    );
  }
  if (Math.abs(valueVariance) > tolerance) {
    errors.push(
      `plannedValue (${input.plannedValue}) must equal plannedQuantity × plannedRate (${expectedPlannedValue})`,
    );
  }
  if (input.plannedQuantity < 0) {
    errors.push('plannedQuantity must be ≥ 0');
  }
  for (const [field, value] of Object.entries({
    materialCost: input.materialCost,
    labourCost: input.labourCost,
    subcontractCost: input.subcontractCost,
    otherCost: input.otherCost,
  })) {
    if (!Number.isFinite(value) || value < 0) {
      errors.push(`${field} must be ≥ 0`);
    }
  }

  return {
    valid: errors.length === 0,
    expectedPlannedRate,
    expectedPlannedValue,
    rateVariance,
    valueVariance,
    errors,
  };
}

export function assertBoqItemTotals(input: BoqTotalsInput): void {
  const result = validateBoqItemTotals(input);
  if (!result.valid) {
    throw new BadRequestException(result.errors.join('; '));
  }
}

export function assertDateRange(
  startDate?: Date | null,
  endDate?: Date | null,
): void {
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    throw new BadRequestException('endDate cannot be before startDate');
  }
}
