import { BadRequestException } from '@nestjs/common';
import { ContractorBillStatus } from './schemas/contractor-bill.schema';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

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
  netPayable: number;
  totalDeductions: number;
};

export function computeBillAmounts(input: BillAmountsInput): BillAmounts {
  const currentCertifiedValue = roundMoney(input.currentCertifiedValue);
  assertNonNegative(currentCertifiedValue, 'currentCertifiedValue');

  const advanceRecovery = roundMoney(input.advanceRecovery ?? 0);
  const materialRecovery = roundMoney(input.materialRecovery ?? 0);
  const retention = roundMoney(input.retention ?? 0);
  const tds = roundMoney(input.tds ?? 0);
  const penalty = roundMoney(input.penalty ?? 0);
  const otherDeductions = roundMoney(input.otherDeductions ?? 0);

  for (const [field, value] of Object.entries({
    advanceRecovery,
    materialRecovery,
    retention,
    tds,
    penalty,
    otherDeductions,
  })) {
    assertNonNegative(value, field);
  }

  const totalDeductions = roundMoney(
    advanceRecovery +
      materialRecovery +
      retention +
      tds +
      penalty +
      otherDeductions,
  );

  if (totalDeductions > currentCertifiedValue + 0.001) {
    throw new BadRequestException(
      'Total deductions cannot exceed currentCertifiedValue',
    );
  }

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

/** Remaining payable on a posted RA bill. */
export function computeRemainingBillPayable(input: {
  netPayable: number;
  paidAmount?: number;
}): number {
  return roundMoney(
    Math.max(0, roundMoney(input.netPayable) - roundMoney(input.paidAmount ?? 0)),
  );
}
