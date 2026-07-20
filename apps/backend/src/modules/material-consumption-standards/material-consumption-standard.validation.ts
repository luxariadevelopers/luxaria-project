import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { BoqUnit } from '../boq/schemas/boq.schema';
import { MaterialConsumptionStandardStatus } from './schemas/material-consumption-standard.schema';

export const EDITABLE_MCS_STATUSES: MaterialConsumptionStandardStatus[] = [
  MaterialConsumptionStandardStatus.Draft,
  MaterialConsumptionStandardStatus.Rejected,
];

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function roundPct(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeWorkType(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    throw new BadRequestException('workType cannot be empty');
  }
  return trimmed;
}

export function normalizeEffectiveDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid effectiveDate');
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function assertBoqOrWorkType(input: {
  boqItemId?: string | null;
  workType?: string | null;
}): void {
  const hasBoq = Boolean(input.boqItemId);
  const hasWork = Boolean(input.workType?.trim());
  if (!hasBoq && !hasWork) {
    throw new BadRequestException('Either boqItemId or workType is required');
  }
}

export function assertQuantityAndWastage(
  quantityPerUnit: number,
  wastagePercentage: number,
): void {
  if (!Number.isFinite(quantityPerUnit) || quantityPerUnit < 0) {
    throw new BadRequestException('quantityPerUnit must be ≥ 0');
  }
  if (
    !Number.isFinite(wastagePercentage) ||
    wastagePercentage < 0 ||
    wastagePercentage > 100
  ) {
    throw new BadRequestException('wastagePercentage must be between 0 and 100');
  }
}

/** Effective consumption including wastage allowance. */
export function effectiveQuantityPerUnit(
  quantityPerUnit: number,
  wastagePercentage: number,
): number {
  return roundQty(quantityPerUnit * (1 + wastagePercentage / 100));
}

export function buildScopeKey(input: {
  projectId?: string | null;
  boqItemId?: string | null;
  workType?: string | null;
  materialId: string;
  outputUnit: BoqUnit;
}): string {
  assertBoqOrWorkType(input);
  const workPart = input.boqItemId
    ? `boq:${input.boqItemId}`
    : `wt:${normalizeWorkType(input.workType!).toLowerCase()}`;
  const matPart = `mat:${input.materialId}`;
  const unitPart = String(input.outputUnit);
  if (input.projectId) {
    return `p:${input.projectId}|${workPart}|${matPart}|${unitPart}`;
  }
  return `g|${workPart}|${matPart}|${unitPart}`;
}

export function assertEditable(status: MaterialConsumptionStandardStatus): void {
  if (!EDITABLE_MCS_STATUSES.includes(status)) {
    throw new BadRequestException(
      `Standard is immutable (status=${status}). Create a new version to change it.`,
    );
  }
}

export function requireObjectId(id: string, field: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return new Types.ObjectId(id);
}
