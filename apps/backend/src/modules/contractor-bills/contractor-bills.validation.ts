import { BadRequestException } from '@nestjs/common';
import {
  computePeriodBillPayable,
  roundMoney,
  roundQty,
} from './contractor-bills.calculation';
import { ContractorBillStatus } from './schemas/contractor-bill.schema';

export { roundMoney, roundQty };

export function normalizePeriodDate(value: string | Date, field: string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function assertBillingPeriod(from: Date, to: Date): void {
  if (from.getTime() > to.getTime()) {
    throw new BadRequestException('billingPeriod.from cannot be after to');
  }
}

export function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
}

export type BillAmountsInput = {
  currentCertifiedValue: number;
  approvedExtras?: number;
  priceEscalation?: number;
  advanceRecovery?: number;
  materialRecovery?: number;
  equipmentRecovery?: number;
  labourRecovery?: number;
  retention?: number;
  tds?: number;
  penalty?: number;
  otherDeductions?: number;
  gst?: number;
};

export type BillAmounts = {
  currentCertifiedValue: number;
  approvedExtras: number;
  priceEscalation: number;
  advanceRecovery: number;
  materialRecovery: number;
  equipmentRecovery: number;
  labourRecovery: number;
  retention: number;
  tds: number;
  penalty: number;
  otherDeductions: number;
  gst: number;
  netPayable: number;
  totalDeductions: number;
};

/**
 * Period RA amounts (backward-compatible). Delegates to
 * {@link computePeriodBillPayable} / full CTR formula with previous = 0.
 */
export function computeBillAmounts(input: BillAmountsInput): BillAmounts {
  const currentCertifiedValue = roundMoney(input.currentCertifiedValue);
  assertNonNegative(currentCertifiedValue, 'currentCertifiedValue');

  const result = computePeriodBillPayable({
    currentCertifiedValue,
    approvedExtras: input.approvedExtras,
    priceEscalation: input.priceEscalation,
    advanceRecovery: input.advanceRecovery,
    materialRecovery: input.materialRecovery,
    equipmentRecovery: input.equipmentRecovery,
    labourRecovery: input.labourRecovery,
    retention: input.retention,
    penalty: input.penalty,
    tds: input.tds,
    otherDeductions: input.otherDeductions,
    gst: input.gst,
  });

  return {
    currentCertifiedValue,
    approvedExtras: result.approvedExtras,
    priceEscalation: result.priceEscalation,
    advanceRecovery: result.advanceRecovery,
    materialRecovery: result.materialRecovery,
    equipmentRecovery: result.equipmentRecovery,
    labourRecovery: result.labourRecovery,
    retention: result.retention,
    tds: result.tds,
    penalty: result.penalties,
    otherDeductions: result.otherDeductions,
    gst: result.gst,
    totalDeductions: result.totalDeductions,
    netPayable: result.netPayable,
  };
}

/** Default retention from agreement % of current certified value. */
export function computeRetentionAmount(
  currentCertifiedValue: number,
  retentionPercentage: number,
): number {
  assertNonNegative(retentionPercentage, 'retentionPercentage');
  if (retentionPercentage > 100) {
    throw new BadRequestException('retentionPercentage cannot exceed 100');
  }
  return roundMoney((currentCertifiedValue * retentionPercentage) / 100);
}

/** Percent-per-bill advance recovery capped by remaining advance. */
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
    const override = roundMoney(input.overrideAmount);
    assertNonNegative(override, 'advanceRecovery');
    if (override > remaining) {
      throw new BadRequestException(
        `advanceRecovery ${override} exceeds remaining advance ${remaining}`,
      );
    }
    return override;
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

export function assertTransition(
  from: ContractorBillStatus,
  to: ContractorBillStatus,
  allowed: ContractorBillStatus[],
): void {
  if (!allowed.includes(from)) {
    throw new BadRequestException(
      `Cannot move bill from ${from} to ${to}`,
    );
  }
}

export const EDITABLE_BILL_STATUSES = [
  ContractorBillStatus.Draft,
  ContractorBillStatus.Rejected,
] as const;

/** Statuses that block re-use of a measurement (open or certified). */
export const MEASUREMENT_BLOCKING_BILL_STATUSES: readonly ContractorBillStatus[] =
  [
    ContractorBillStatus.Draft,
    ContractorBillStatus.Claimed,
    ContractorBillStatus.EngineerVerified,
    ContractorBillStatus.PmCertified,
    ContractorBillStatus.FinanceVerified,
    ContractorBillStatus.DirectorApproved,
    ContractorBillStatus.Posted,
    ContractorBillStatus.PartiallyPaid,
    ContractorBillStatus.Paid,
    ContractorBillStatus.Closed,
  ];

/** Prior RAs that contribute to previousCertifiedValue / advance recovered. */
export const CERTIFIED_BILL_STATUSES: readonly ContractorBillStatus[] = [
  ContractorBillStatus.Posted,
  ContractorBillStatus.PartiallyPaid,
  ContractorBillStatus.Paid,
  ContractorBillStatus.Closed,
];

/**
 * Phase 6 conceptual status names → persisted `ContractorBillStatus`.
 * `qs_certified` / `payment_certified` are aliases (not stored separately).
 * `partially_paid` / `closed` are additive persisted statuses.
 */
export const PHASE6_BILL_STATUS_ALIASES = {
  qs_certified: ContractorBillStatus.EngineerVerified,
  payment_certified: ContractorBillStatus.Posted,
  partially_paid: ContractorBillStatus.PartiallyPaid,
  closed: ContractorBillStatus.Closed,
} as const;

export type Phase6BillStatusAlias = keyof typeof PHASE6_BILL_STATUS_ALIASES;

export function resolvePersistedBillStatus(
  aliasOrStatus: string,
): ContractorBillStatus | null {
  if (
    Object.values(ContractorBillStatus).includes(
      aliasOrStatus as ContractorBillStatus,
    )
  ) {
    return aliasOrStatus as ContractorBillStatus;
  }
  if (aliasOrStatus in PHASE6_BILL_STATUS_ALIASES) {
    return PHASE6_BILL_STATUS_ALIASES[
      aliasOrStatus as Phase6BillStatusAlias
    ];
  }
  return null;
}

/**
 * Display / integration alias for a persisted bill status (+ payment progress).
 * Does not change the stored status string.
 */
export function toPhase6BillStatusAlias(input: {
  status: ContractorBillStatus;
  netPayable: number;
  paidAmount?: number;
}): string {
  const { status } = input;
  if (status === ContractorBillStatus.Closed) return 'closed';
  if (status === ContractorBillStatus.PartiallyPaid) return 'partially_paid';
  if (status === ContractorBillStatus.Paid) return 'paid';
  if (status === ContractorBillStatus.Posted) {
    const paid = roundMoney(input.paidAmount ?? 0);
    const remaining = roundMoney(Math.max(0, roundMoney(input.netPayable) - paid));
    if (paid > 0.005 && remaining > 0.005) return 'partially_paid';
    return 'payment_certified';
  }
  if (status === ContractorBillStatus.EngineerVerified) return 'qs_certified';
  return status;
}

/** Remaining payable on a posted RA bill. */
export function computeRemainingBillPayable(input: {
  netPayable: number;
  paidAmount?: number;
}): number {
  return roundMoney(
    Math.max(0, roundMoney(input.netPayable) - roundMoney(input.paidAmount ?? 0)),
  );
}
