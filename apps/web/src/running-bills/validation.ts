import { z } from 'zod';
import { isoDateOnlySchema } from '@/validation';
import type {
  AgreementBoqItemOption,
  CreateContractorBillInput,
  EligibleWorkMeasurement,
  UpdateContractorBillInput,
} from './types';

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const nonNegativeMoney = z.coerce
  .number({ invalid_type_error: 'Amount must be a number' })
  .finite('Amount must be a finite number')
  .min(0, 'Amount must be ≥ 0');

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Mirrors Nest `computeBillAmounts`. */
export type BillAmountsInput = {
  currentCertifiedValue: number;
  advanceRecovery?: number;
  materialRecovery?: number;
  retention?: number;
  tds?: number;
  penalty?: number;
  otherDeductions?: number;
};

export type BillAmounts = {
  currentCertifiedValue: number;
  advanceRecovery: number;
  materialRecovery: number;
  retention: number;
  tds: number;
  penalty: number;
  otherDeductions: number;
  totalDeductions: number;
  netPayable: number;
};

export function computeBillAmounts(input: BillAmountsInput): BillAmounts {
  const currentCertifiedValue = roundMoney(input.currentCertifiedValue);
  const advanceRecovery = roundMoney(input.advanceRecovery ?? 0);
  const materialRecovery = roundMoney(input.materialRecovery ?? 0);
  const retention = roundMoney(input.retention ?? 0);
  const tds = roundMoney(input.tds ?? 0);
  const penalty = roundMoney(input.penalty ?? 0);
  const otherDeductions = roundMoney(input.otherDeductions ?? 0);

  const totalDeductions = roundMoney(
    advanceRecovery +
      materialRecovery +
      retention +
      tds +
      penalty +
      otherDeductions,
  );

  return {
    currentCertifiedValue,
    advanceRecovery,
    materialRecovery,
    retention,
    tds,
    penalty,
    otherDeductions,
    totalDeductions,
    netPayable: roundMoney(currentCertifiedValue - totalDeductions),
  };
}

export function computeRetentionAmount(
  currentCertifiedValue: number,
  retentionPercentage: number,
): number {
  return roundMoney((currentCertifiedValue * retentionPercentage) / 100);
}

export function computeAdvanceRecovery(input: {
  currentCertifiedValue: number;
  advanceAmount: number;
  alreadyRecovered: number;
  percentPerBill?: number | null;
  overrideAmount?: number | null;
}): number {
  const remaining = roundMoney(
    Math.max(0, input.advanceAmount - input.alreadyRecovered),
  );
  if (remaining <= 0) return 0;

  if (input.overrideAmount != null) {
    return Math.min(remaining, roundMoney(input.overrideAmount));
  }

  if (
    input.percentPerBill != null &&
    Number.isFinite(input.percentPerBill) &&
    input.percentPerBill > 0
  ) {
    const proposed = roundMoney(
      (input.currentCertifiedValue * input.percentPerBill) / 100,
    );
    return Math.min(remaining, proposed);
  }

  return 0;
}

export type CalculationLine = {
  measurementId: string;
  measurementNumber: string;
  boqItemId: string;
  boqCode: string | null;
  description: string;
  unit: string;
  previousQuantity: number;
  currentQuantity: number;
  cumulativeQuantity: number;
  boqPlannedQuantity: number;
  rate: number;
  amount: number;
  exceedsBoq: boolean;
};

export function resolveAgreementRate(
  measurement: Pick<
    EligibleWorkMeasurement,
    'boqItemId' | 'boqCode'
  >,
  boqItems: readonly AgreementBoqItemOption[],
): number | null {
  const byId = boqItems.find(
    (line) => line.boqItemId && line.boqItemId === measurement.boqItemId,
  );
  if (byId) return byId.agreedRate;

  const code = measurement.boqCode?.trim().toUpperCase();
  if (!code) return null;
  const byCode = boqItems.find(
    (line) => line.boqCode?.trim().toUpperCase() === code,
  );
  return byCode?.agreedRate ?? null;
}

/**
 * Build calculation grid lines from selected verified measurements + agreement rates.
 * Nest remains authoritative on create/update.
 */
export function buildCalculationLines(
  measurements: readonly EligibleWorkMeasurement[],
  selectedIds: readonly string[],
  boqItems: readonly AgreementBoqItemOption[],
): CalculationLine[] {
  const selected = new Set(selectedIds);
  const lines: CalculationLine[] = [];

  for (const measurement of measurements) {
    if (!selected.has(measurement.id)) continue;
    const rate = resolveAgreementRate(measurement, boqItems) ?? 0;
    const currentQuantity = roundQty(measurement.currentQuantity);
    const cumulativeQuantity = roundQty(measurement.cumulativeQuantity);
    const amount = roundMoney(currentQuantity * rate);
    lines.push({
      measurementId: measurement.id,
      measurementNumber: measurement.measurementNumber,
      boqItemId: measurement.boqItemId,
      boqCode: measurement.boqCode,
      description: measurement.location,
      unit: measurement.unit,
      previousQuantity: roundQty(measurement.previousQuantity),
      currentQuantity,
      cumulativeQuantity,
      boqPlannedQuantity: roundQty(measurement.boqPlannedQuantity),
      rate: roundMoney(rate),
      amount,
      exceedsBoq: cumulativeQuantity > measurement.boqPlannedQuantity + 1e-9,
    });
  }

  return lines;
}

export function sumCurrentCertifiedValue(
  lines: readonly Pick<CalculationLine, 'amount'>[],
): number {
  return roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));
}

/**
 * Soft client check — Nest returns 409 when a measurement is already on an open bill.
 */
export function findDuplicateMeasurementIds(
  measurementIds: readonly string[],
): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const id of measurementIds) {
    if (seen.has(id)) {
      if (!dupes.includes(id)) dupes.push(id);
    } else {
      seen.add(id);
    }
  }
  return dupes;
}

export function measurementIdsAlreadyOnOpenBills(
  selectedIds: readonly string[],
  billedMeasurementIds: ReadonlySet<string>,
): string[] {
  return selectedIds.filter((id) => billedMeasurementIds.has(id));
}

/** Net payable must equal current − deductions (within 1 paise). */
export function netPayableReconciles(
  amounts: BillAmounts,
  expectedNet?: number,
): boolean {
  const target =
    expectedNet == null
      ? roundMoney(amounts.currentCertifiedValue - amounts.totalDeductions)
      : roundMoney(expectedNet);
  return Math.abs(amounts.netPayable - target) < 0.005;
}

export const runningBillFormSchema = z
  .object({
    projectId: mongoIdSchema,
    contractorId: mongoIdSchema,
    agreementId: mongoIdSchema,
    billingPeriodFrom: isoDateOnlySchema,
    billingPeriodTo: isoDateOnlySchema,
    measurementIds: z
      .array(mongoIdSchema)
      .min(1, 'Select at least one verified measurement'),
    advanceRecovery: nonNegativeMoney.optional(),
    materialRecovery: nonNegativeMoney.optional(),
    retention: nonNegativeMoney.optional(),
    tds: nonNegativeMoney.optional(),
    penalty: nonNegativeMoney.optional(),
    otherDeductions: nonNegativeMoney.optional(),
    invoiceDocument: z
      .string()
      .max(200)
      .optional()
      .nullable()
      .or(z.literal('')),
    notes: z.string().max(2000).optional().nullable().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    if (values.billingPeriodFrom > values.billingPeriodTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Billing period from cannot be after to',
        path: ['billingPeriodFrom'],
      });
    }
    const dupes = findDuplicateMeasurementIds(values.measurementIds);
    if (dupes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate measurement claim is not allowed',
        path: ['measurementIds'],
      });
    }
  });

export type RunningBillFormValues = z.infer<typeof runningBillFormSchema>;

export function defaultRunningBillFormValues(input: {
  projectId: string;
}): RunningBillFormValues {
  return {
    projectId: input.projectId,
    contractorId: '',
    agreementId: '',
    billingPeriodFrom: '',
    billingPeriodTo: '',
    measurementIds: [],
    advanceRecovery: undefined,
    materialRecovery: 0,
    retention: undefined,
    tds: 0,
    penalty: 0,
    otherDeductions: 0,
    invoiceDocument: '',
    notes: '',
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export function shapeCreatePayload(
  values: RunningBillFormValues,
): CreateContractorBillInput {
  const payload: CreateContractorBillInput = {
    projectId: values.projectId,
    contractorId: values.contractorId,
    agreementId: values.agreementId,
    billingPeriod: {
      from: values.billingPeriodFrom,
      to: values.billingPeriodTo,
    },
    measurementIds: [...new Set(values.measurementIds)],
    materialRecovery: values.materialRecovery ?? 0,
    tds: values.tds ?? 0,
    penalty: values.penalty ?? 0,
    otherDeductions: values.otherDeductions ?? 0,
    invoiceDocument: emptyToNull(values.invoiceDocument),
    notes: emptyToNull(values.notes),
  };
  if (values.advanceRecovery != null) {
    payload.advanceRecovery = values.advanceRecovery;
  }
  if (values.retention != null) {
    payload.retention = values.retention;
  }
  return payload;
}

export function shapeUpdatePayload(
  values: RunningBillFormValues,
): UpdateContractorBillInput {
  const create = shapeCreatePayload(values);
  return {
    billingPeriod: create.billingPeriod,
    measurementIds: create.measurementIds,
    advanceRecovery: create.advanceRecovery,
    materialRecovery: create.materialRecovery,
    retention: create.retention,
    tds: create.tds,
    penalty: create.penalty,
    otherDeductions: create.otherDeductions,
    invoiceDocument: create.invoiceDocument,
    notes: create.notes,
  };
}

/**
 * Certified quantity cannot exceed measurement current qty or BOQ planned.
 * Client soft check — Nest enforces via verified measurements + BOQ rules.
 */
export function certifiedQuantityWithinLimits(line: {
  currentQuantity: number;
  measurementCurrentQuantity: number;
  cumulativeQuantity: number;
  boqPlannedQuantity: number;
}): { ok: true } | { ok: false; message: string } {
  if (line.currentQuantity > line.measurementCurrentQuantity + 1e-9) {
    return {
      ok: false,
      message: 'Certified quantity cannot exceed measurement quantity',
    };
  }
  if (line.cumulativeQuantity > line.boqPlannedQuantity + 1e-9) {
    return {
      ok: false,
      message: 'Cumulative certified quantity cannot exceed BOQ planned quantity',
    };
  }
  return { ok: true };
}

export const DUPLICATE_MEASUREMENT_MESSAGE =
  'One or more measurements are already on an open running bill';

export function isDuplicateMeasurementMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('already on bill') ||
    lower.includes('duplicate measurement')
  );
}
