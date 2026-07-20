import {
  LabourCategoryRateStatus,
  RateScopeKind,
  type PublicLabourCategory,
  type PublicLabourCategoryRate,
  type RateScopeKind as ScopeKind,
} from './types';

function toUtcDay(value: string | Date): number {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return Number.NaN;
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

function scopeKind(rate: {
  projectId: string | null;
  contractorId: string | null;
}): ScopeKind {
  if (rate.projectId && rate.contractorId) {
    return RateScopeKind.ProjectContractor;
  }
  if (rate.projectId) return RateScopeKind.Project;
  if (rate.contractorId) return RateScopeKind.Contractor;
  return RateScopeKind.Company;
}

const SCOPE_PRIORITY: readonly ScopeKind[] = [
  RateScopeKind.ProjectContractor,
  RateScopeKind.Project,
  RateScopeKind.Contractor,
  RateScopeKind.Company,
];

/**
 * Client preview of Nest resolve priority:
 * project+contractor → project → contractor → company defaults.
 * Uses latest active rate with `effectiveDate ≤ asOf`.
 */
export function selectApplicableRate(input: {
  category: PublicLabourCategory;
  rates: readonly PublicLabourCategoryRate[];
  projectId?: string | null;
  contractorId?: string | null;
  asOf?: string | Date;
}): {
  dailyRate: number;
  overtimeRate: number;
  source: ScopeKind;
  rate: PublicLabourCategoryRate | null;
} {
  const asOfMs = toUtcDay(input.asOf ?? new Date());
  const projectId = input.projectId?.trim() || null;
  const contractorId = input.contractorId?.trim() || null;

  const candidates: Array<{
    kind: ScopeKind;
    projectId: string | null;
    contractorId: string | null;
  }> = [];

  if (projectId && contractorId) {
    candidates.push({
      kind: RateScopeKind.ProjectContractor,
      projectId,
      contractorId,
    });
  }
  if (projectId) {
    candidates.push({
      kind: RateScopeKind.Project,
      projectId,
      contractorId: null,
    });
  }
  if (contractorId) {
    candidates.push({
      kind: RateScopeKind.Contractor,
      projectId: null,
      contractorId,
    });
  }

  for (const candidate of candidates) {
    const matching = input.rates
      .filter(
        (rate) =>
          rate.status === LabourCategoryRateStatus.Active &&
          (rate.projectId ?? null) === candidate.projectId &&
          (rate.contractorId ?? null) === candidate.contractorId &&
          !Number.isNaN(toUtcDay(rate.effectiveDate)) &&
          toUtcDay(rate.effectiveDate) <= asOfMs,
      )
      .sort((a, b) => toUtcDay(b.effectiveDate) - toUtcDay(a.effectiveDate));

    const best = matching[0];
    if (best) {
      return {
        dailyRate: best.dailyRate,
        overtimeRate: best.overtimeRate,
        source: candidate.kind,
        rate: best,
      };
    }
  }

  return {
    dailyRate: input.category.defaultDailyRate,
    overtimeRate: input.category.overtimeRate,
    source: RateScopeKind.Company,
    rate: null,
  };
}

/** Rank for sorting override rows by Nest priority (highest first). */
export function rateScopePriority(rate: {
  projectId: string | null;
  contractorId: string | null;
}): number {
  const kind = scopeKind(rate);
  const index = SCOPE_PRIORITY.indexOf(kind);
  return index === -1 ? SCOPE_PRIORITY.length : index;
}
