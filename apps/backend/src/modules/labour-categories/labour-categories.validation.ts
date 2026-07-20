import { BadRequestException } from '@nestjs/common';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function assertNonNegativeRate(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
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

export function buildRateScopeKey(input: {
  labourCategoryId: string;
  projectId?: string | null;
  contractorId?: string | null;
}): string {
  const projectPart = input.projectId ? `p:${input.projectId}` : 'p:g';
  const contractorPart = input.contractorId
    ? `c:${input.contractorId}`
    : 'c:g';
  return `cat:${input.labourCategoryId}|${projectPart}|${contractorPart}`;
}

export type RateScopeKind =
  | 'project_contractor'
  | 'project'
  | 'contractor'
  | 'company';

export function resolveRateScopeKind(input: {
  projectId?: string | null;
  contractorId?: string | null;
}): RateScopeKind {
  if (input.projectId && input.contractorId) return 'project_contractor';
  if (input.projectId) return 'project';
  if (input.contractorId) return 'contractor';
  return 'company';
}

export function assertScopedRateTargets(input: {
  projectId?: string | null;
  contractorId?: string | null;
}): void {
  if (!input.projectId && !input.contractorId) {
    throw new BadRequestException(
      'Rate override requires projectId and/or contractorId (company defaults live on the category)',
    );
  }
}
