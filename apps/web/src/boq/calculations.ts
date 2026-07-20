import { roundMoney } from '@/validation';

/** Mirrors Nest `computePlannedRate`. */
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

/** Mirrors Nest `computePlannedValue`. */
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

export type BoqItemTotalsCheck = {
  valid: boolean;
  expectedPlannedRate: number;
  expectedPlannedValue: number;
  rateVariance: number;
  valueVariance: number;
  errors: string[];
};

/** Mirrors Nest `validateBoqItemTotals` (tolerance 0.005). */
export function validateBoqItemTotals(
  input: BoqTotalsInput,
  tolerance = 0.005,
): BoqItemTotalsCheck {
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

/**
 * Date consistency — mirrors Nest `assertDateRange`.
 * Empty / null ends are allowed; end cannot precede start.
 */
export function assertBoqDateRange(
  startDate?: string | null,
  endDate?: string | null,
): { ok: true } | { ok: false; message: string } {
  if (!startDate || !endDate) {
    return { ok: true };
  }
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return { ok: false, message: 'Dates must be valid ISO date strings.' };
  }
  if (end < start) {
    return { ok: false, message: 'endDate cannot be before startDate' };
  }
  return { ok: true };
}
