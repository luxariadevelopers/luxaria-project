import { BadRequestException } from '@nestjs/common';
import { ContractorAgreementExpiryAlertType } from './schemas/contractor-agreement.schema';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function assertDateRange(startDate: Date, endDate: Date): void {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new BadRequestException('Invalid startDate or endDate');
  }
  if (startDate.getTime() > endDate.getTime()) {
    throw new BadRequestException('startDate cannot be after endDate');
  }
}

export function assertRetentionPercentage(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new BadRequestException('retentionPercentage must be between 0 and 100');
  }
}

export function assertManpower(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException('manpowerCommitment must be ≥ 0');
  }
}

export function normalizeSkillMix(
  entries?: Array<{ skill: string; headcount: number }> | null,
): Array<{ skill: string; headcount: number }> {
  if (!entries?.length) return [];
  const out: Array<{ skill: string; headcount: number }> = [];
  for (const entry of entries) {
    const skill = entry.skill?.trim();
    if (!skill) {
      throw new BadRequestException('skillMix.skill is required');
    }
    if (!Number.isFinite(entry.headcount) || entry.headcount < 0) {
      throw new BadRequestException('skillMix.headcount must be ≥ 0');
    }
    out.push({ skill, headcount: entry.headcount });
  }
  return out;
}

export function computeBoqLineValue(
  agreedQuantity: number,
  agreedRate: number,
): number {
  if (!Number.isFinite(agreedQuantity) || agreedQuantity < 0) {
    throw new BadRequestException('boqItems.agreedQuantity must be ≥ 0');
  }
  if (!Number.isFinite(agreedRate) || agreedRate < 0) {
    throw new BadRequestException('boqItems.agreedRate must be ≥ 0');
  }
  return roundMoney(agreedQuantity * agreedRate);
}

export function summarizeBoqItems(
  items: Array<{ agreedQuantity: number; agreedRate: number; agreedValue: number }>,
): { agreedQuantity: number; agreedRatesTotal: number } {
  let agreedQuantity = 0;
  let agreedRatesTotal = 0;
  for (const item of items) {
    agreedQuantity = roundQty(agreedQuantity + item.agreedQuantity);
    agreedRatesTotal = roundMoney(agreedRatesTotal + item.agreedValue);
  }
  return { agreedQuantity, agreedRatesTotal };
}

export function daysUntil(endDate: Date, asOf: Date = new Date()): number {
  const end = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
  );
  const start = Date.UTC(
    asOf.getUTCFullYear(),
    asOf.getUTCMonth(),
    asOf.getUTCDate(),
  );
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

export function resolveExpiryAlertType(input: {
  daysRemaining: number;
  warningDays: number;
}): ContractorAgreementExpiryAlertType | null {
  if (input.daysRemaining < 0) {
    return ContractorAgreementExpiryAlertType.Expired;
  }
  if (input.daysRemaining <= 7) {
    return ContractorAgreementExpiryAlertType.ExpiringCritical;
  }
  if (input.daysRemaining <= input.warningDays) {
    return ContractorAgreementExpiryAlertType.ExpiringSoon;
  }
  return null;
}

export function expiryAlertMessage(input: {
  agreementNumber: string;
  daysRemaining: number;
  alertType: ContractorAgreementExpiryAlertType;
}): string {
  if (input.alertType === ContractorAgreementExpiryAlertType.Expired) {
    return `Contractor agreement ${input.agreementNumber} expired ${Math.abs(input.daysRemaining)} day(s) ago`;
  }
  return `Contractor agreement ${input.agreementNumber} expires in ${input.daysRemaining} day(s)`;
}
