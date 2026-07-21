import { BadRequestException } from '@nestjs/common';

/** Money to 2 decimal places (paise). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Quantities to 6 decimal places. */
export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * Phase 6 / CTR running-bill payable formula (pure):
 *
 * Gross Work Value
 * + Approved Extras
 * + Price Escalation
 * − Previous Certified Value
 * − Retention
 * − Advance Recovery
 * − Material / Equipment / Labour Recoveries
 * − Penalties
 * − TDS
 * − Other deductions
 * + GST
 * = Net Payable
 *
 * Money rounded to 2 decimal places (paise) at each component and result.
 */
export type RunningBillCalculationInput = {
  /** Gross work value (typically cumulative certified work to date). */
  grossWorkValue: number;
  approvedExtras?: number;
  priceEscalation?: number;
  previousCertifiedValue?: number;
  retention?: number;
  advanceRecovery?: number;
  materialRecovery?: number;
  equipmentRecovery?: number;
  labourRecovery?: number;
  /** Penalties / LD (alias of bill.penalty). */
  penalties?: number;
  tds?: number;
  otherDeductions?: number;
  gst?: number;
};

export type RunningBillCalculationResult = {
  grossWorkValue: number;
  approvedExtras: number;
  priceEscalation: number;
  previousCertifiedValue: number;
  retention: number;
  advanceRecovery: number;
  materialRecovery: number;
  equipmentRecovery: number;
  labourRecovery: number;
  penalties: number;
  tds: number;
  otherDeductions: number;
  gst: number;
  /** Current period gross = gross − previous (+ extras + escalation). */
  currentGrossValue: number;
  totalRecoveries: number;
  totalDeductions: number;
  netPayable: number;
};

function assertNonNegativeMoney(value: number, field: string): number {
  const rounded = roundMoney(value);
  if (!Number.isFinite(rounded) || rounded < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
  return rounded;
}

/**
 * Pure running-bill payable calculation with decimal rounding.
 * Does not mutate inputs; throws BadRequestException on invalid amounts.
 */
export function computeRunningBillPayable(
  input: RunningBillCalculationInput,
): RunningBillCalculationResult {
  const grossWorkValue = assertNonNegativeMoney(
    input.grossWorkValue,
    'grossWorkValue',
  );
  const approvedExtras = assertNonNegativeMoney(
    input.approvedExtras ?? 0,
    'approvedExtras',
  );
  const priceEscalation = assertNonNegativeMoney(
    input.priceEscalation ?? 0,
    'priceEscalation',
  );
  const previousCertifiedValue = assertNonNegativeMoney(
    input.previousCertifiedValue ?? 0,
    'previousCertifiedValue',
  );
  const retention = assertNonNegativeMoney(input.retention ?? 0, 'retention');
  const advanceRecovery = assertNonNegativeMoney(
    input.advanceRecovery ?? 0,
    'advanceRecovery',
  );
  const materialRecovery = assertNonNegativeMoney(
    input.materialRecovery ?? 0,
    'materialRecovery',
  );
  const equipmentRecovery = assertNonNegativeMoney(
    input.equipmentRecovery ?? 0,
    'equipmentRecovery',
  );
  const labourRecovery = assertNonNegativeMoney(
    input.labourRecovery ?? 0,
    'labourRecovery',
  );
  const penalties = assertNonNegativeMoney(input.penalties ?? 0, 'penalties');
  const tds = assertNonNegativeMoney(input.tds ?? 0, 'tds');
  const otherDeductions = assertNonNegativeMoney(
    input.otherDeductions ?? 0,
    'otherDeductions',
  );
  const gst = assertNonNegativeMoney(input.gst ?? 0, 'gst');

  if (previousCertifiedValue - grossWorkValue > 0.005) {
    throw new BadRequestException(
      'previousCertifiedValue cannot exceed grossWorkValue',
    );
  }

  const currentGrossValue = roundMoney(
    grossWorkValue +
      approvedExtras +
      priceEscalation -
      previousCertifiedValue,
  );

  const totalRecoveries = roundMoney(
    advanceRecovery +
      materialRecovery +
      equipmentRecovery +
      labourRecovery +
      penalties,
  );

  const totalDeductions = roundMoney(
    retention + totalRecoveries + tds + otherDeductions,
  );

  const deductibleBase = roundMoney(currentGrossValue + gst);
  if (totalDeductions - deductibleBase > 0.005) {
    throw new BadRequestException(
      'Total deductions cannot exceed current gross work value plus GST',
    );
  }

  const netPayable = roundMoney(currentGrossValue - totalDeductions + gst);

  return {
    grossWorkValue,
    approvedExtras,
    priceEscalation,
    previousCertifiedValue,
    retention,
    advanceRecovery,
    materialRecovery,
    equipmentRecovery,
    labourRecovery,
    penalties,
    tds,
    otherDeductions,
    gst,
    currentGrossValue,
    totalRecoveries,
    totalDeductions,
    netPayable,
  };
}

/**
 * Period-bill helper: gross is this RA's certified work only
 * (previous already excluded). Maps onto the full CTR formula with
 * previousCertifiedValue = 0 at the payable step.
 */
export function computePeriodBillPayable(input: {
  currentCertifiedValue: number;
  approvedExtras?: number;
  priceEscalation?: number;
  retention?: number;
  advanceRecovery?: number;
  materialRecovery?: number;
  equipmentRecovery?: number;
  labourRecovery?: number;
  penalty?: number;
  tds?: number;
  otherDeductions?: number;
  gst?: number;
}): RunningBillCalculationResult {
  return computeRunningBillPayable({
    grossWorkValue: input.currentCertifiedValue,
    approvedExtras: input.approvedExtras,
    priceEscalation: input.priceEscalation,
    previousCertifiedValue: 0,
    retention: input.retention,
    advanceRecovery: input.advanceRecovery,
    materialRecovery: input.materialRecovery,
    equipmentRecovery: input.equipmentRecovery,
    labourRecovery: input.labourRecovery,
    penalties: input.penalty,
    tds: input.tds,
    otherDeductions: input.otherDeductions,
    gst: input.gst,
  });
}
