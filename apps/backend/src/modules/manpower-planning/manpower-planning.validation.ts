import { BadRequestException } from '@nestjs/common';
import {
  ManpowerEscalation,
  ManpowerShortfallAlertType,
} from './schemas/manpower-shortfall-alert.schema';

export function normalizePlanDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid planDate / asOfDate');
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return normalizePlanDate(next);
}

export function normalizeSkillKey(skill: string): string {
  return skill
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function skillsMatch(a: string, b: string): boolean {
  const left = normalizeSkillKey(a);
  const right = normalizeSkillKey(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

export function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
}

export function normalizePlanSkillMix(
  entries?: Array<{
    labourCategoryId?: string | null;
    skill: string;
    plannedHeadcount: number;
    isCritical?: boolean;
  }> | null,
): Array<{
  labourCategoryId: string | null;
  skill: string;
  plannedHeadcount: number;
  isCritical: boolean;
}> {
  if (!entries?.length) return [];
  const out: Array<{
    labourCategoryId: string | null;
    skill: string;
    plannedHeadcount: number;
    isCritical: boolean;
  }> = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const skill = entry.skill?.trim();
    if (!skill) {
      throw new BadRequestException('skillMix.skill is required');
    }
    assertNonNegative(entry.plannedHeadcount, 'skillMix.plannedHeadcount');
    const key = normalizeSkillKey(skill);
    if (seen.has(key)) {
      throw new BadRequestException(`Duplicate skill in plan: ${skill}`);
    }
    seen.add(key);
    out.push({
      labourCategoryId: entry.labourCategoryId?.trim() || null,
      skill,
      plannedHeadcount: Math.trunc(entry.plannedHeadcount),
      isCritical: Boolean(entry.isCritical),
    });
  }
  return out;
}

/** Actual / expected as a fill rate 0–100. Missing expected → 100 if actual ≥ 0. */
export function fillRatePercent(actual: number, expected: number): number {
  if (!Number.isFinite(actual) || actual < 0) return 0;
  if (!Number.isFinite(expected) || expected <= 0) {
    return actual > 0 ? 100 : 100;
  }
  return Math.min(100, Math.round((actual / expected) * 10000) / 100);
}

export function shortfallPercent(actual: number, expected: number): number {
  const fill = fillRatePercent(actual, expected);
  return Math.max(0, Math.round((100 - fill) * 100) / 100);
}

/**
 * Count consecutive days ending at the latest day where fill rate is below threshold.
 * `dailyFillRates` must be oldest → newest for the window ending at asOf.
 */
export function countConsecutiveDaysBelow(
  dailyFillRates: number[],
  thresholdPercent: number,
): number {
  let streak = 0;
  for (let i = dailyFillRates.length - 1; i >= 0; i -= 1) {
    if (dailyFillRates[i] < thresholdPercent) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export type SkillGapInput = {
  skill: string;
  committedHeadcount: number;
  plannedHeadcount: number;
  actualHeadcount: number;
  isCritical: boolean;
};

export function buildSkillGaps(input: {
  committed: Array<{ skill: string; headcount: number }>;
  planned: Array<{ skill: string; plannedHeadcount: number; isCritical: boolean }>;
  actualBySkill: Array<{ skill: string; headcount: number }>;
}): SkillGapInput[] {
  const skills = new Map<string, SkillGapInput>();

  for (const entry of input.committed) {
    const key = normalizeSkillKey(entry.skill);
    skills.set(key, {
      skill: entry.skill.trim(),
      committedHeadcount: entry.headcount,
      plannedHeadcount: 0,
      actualHeadcount: 0,
      isCritical: entry.headcount > 0,
    });
  }

  for (const entry of input.planned) {
    const key = normalizeSkillKey(entry.skill);
    const existing = skills.get(key);
    if (existing) {
      existing.plannedHeadcount = entry.plannedHeadcount;
      existing.isCritical = existing.isCritical || entry.isCritical;
      if (!existing.skill) existing.skill = entry.skill;
    } else {
      skills.set(key, {
        skill: entry.skill.trim(),
        committedHeadcount: 0,
        plannedHeadcount: entry.plannedHeadcount,
        actualHeadcount: 0,
        isCritical: entry.isCritical,
      });
    }
  }

  for (const actual of input.actualBySkill) {
    const key = normalizeSkillKey(actual.skill);
    let matchedKey: string | null = skills.has(key) ? key : null;
    if (!matchedKey) {
      for (const existingKey of skills.keys()) {
        if (skillsMatch(existingKey, key)) {
          matchedKey = existingKey;
          break;
        }
      }
    }
    if (matchedKey) {
      const row = skills.get(matchedKey)!;
      row.actualHeadcount += actual.headcount;
    } else {
      skills.set(key, {
        skill: actual.skill.trim(),
        committedHeadcount: 0,
        plannedHeadcount: 0,
        actualHeadcount: actual.headcount,
        isCritical: false,
      });
    }
  }

  return [...skills.values()].map((row) => ({
    ...row,
  }));
}

export function missingCriticalSkills(gaps: SkillGapInput[]): SkillGapInput[] {
  return gaps.filter(
    (gap) =>
      gap.isCritical &&
      (gap.plannedHeadcount > 0 || gap.committedHeadcount > 0) &&
      gap.actualHeadcount <= 0,
  );
}

export type BoqProgressItem = {
  plannedQuantity: number;
  startDate: Date | null;
  endDate: Date | null;
  actualCumulative: number;
};

/** Linear time-phased BOQ progress vs actual cumulative. */
export function evaluateWorkProgress(input: {
  items: BoqProgressItem[];
  asOf: Date;
  behindThresholdRatio?: number;
}): {
  behind: boolean;
  expectedRatio: number;
  actualRatio: number;
  progressShortfallPercent: number;
  expectedScheduleImpactDays: number;
} {
  const threshold = input.behindThresholdRatio ?? 0.9;
  let plannedTotal = 0;
  let expectedTotal = 0;
  let actualTotal = 0;
  let maxRemainingDays = 0;

  for (const item of input.items) {
    if (!Number.isFinite(item.plannedQuantity) || item.plannedQuantity <= 0) {
      continue;
    }
    plannedTotal += item.plannedQuantity;
    actualTotal += Math.max(0, item.actualCumulative || 0);

    if (!item.startDate || !item.endDate) {
      expectedTotal += item.plannedQuantity;
      continue;
    }

    const start = normalizePlanDate(item.startDate);
    const end = normalizePlanDate(item.endDate);
    const asOf = normalizePlanDate(input.asOf);
    const totalDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
    );
    const elapsed = Math.min(
      totalDays,
      Math.max(
        0,
        Math.round((asOf.getTime() - start.getTime()) / 86_400_000) + 1,
      ),
    );
    expectedTotal += item.plannedQuantity * (elapsed / totalDays);
    const remaining = Math.max(0, totalDays - elapsed);
    maxRemainingDays = Math.max(maxRemainingDays, remaining);
  }

  if (plannedTotal <= 0) {
    return {
      behind: false,
      expectedRatio: 0,
      actualRatio: 0,
      progressShortfallPercent: 0,
      expectedScheduleImpactDays: 0,
    };
  }

  const expectedRatio = expectedTotal / plannedTotal;
  const actualRatio = actualTotal / plannedTotal;
  const behind =
    expectedRatio > 0 && actualRatio < expectedRatio * threshold;
  const progressShortfallPercent =
    expectedRatio <= 0
      ? 0
      : Math.max(
          0,
          Math.round((1 - actualRatio / expectedRatio) * 10000) / 100,
        );
  const gapRatio = Math.max(0, expectedRatio - actualRatio);
  const expectedScheduleImpactDays =
    Math.round(gapRatio * Math.max(maxRemainingDays, 1) * 100) / 100;

  return {
    behind,
    expectedRatio: Math.round(expectedRatio * 10000) / 10000,
    actualRatio: Math.round(actualRatio * 10000) / 10000,
    progressShortfallPercent,
    expectedScheduleImpactDays,
  };
}

export function estimateManpowerScheduleImpact(input: {
  shortfallPercent: number;
  consecutiveDays: number;
}): number {
  if (input.shortfallPercent <= 0 || input.consecutiveDays <= 0) return 0;
  return (
    Math.round(
      input.consecutiveDays * (input.shortfallPercent / 100) * 0.5 * 100,
    ) / 100
  );
}

export function recommendEscalation(
  alertType: ManpowerShortfallAlertType,
): ManpowerEscalation {
  switch (alertType) {
    case ManpowerShortfallAlertType.Below60ThreeDays:
      return ManpowerEscalation.CommercialAndPm;
    case ManpowerShortfallAlertType.WorkProgressBehindPlan:
      return ManpowerEscalation.ProjectManager;
    case ManpowerShortfallAlertType.MissingCriticalSkill:
      return ManpowerEscalation.ProjectManager;
    case ManpowerShortfallAlertType.Below80TwoConsecutiveDays:
      return ManpowerEscalation.SiteSupervisor;
    case ManpowerShortfallAlertType.NoAttendanceSubmitted:
      return ManpowerEscalation.SiteSupervisor;
    default:
      return ManpowerEscalation.SiteSupervisor;
  }
}

export type DailyManpowerObservation = {
  date: Date;
  agreementHeadcount: number;
  plannedHeadcount: number;
  actualHeadcount: number;
  attendanceSubmitted: boolean;
  skillGaps: SkillGapInput[];
};

export type ResolvedShortfallAlert = {
  alertType: ManpowerShortfallAlertType;
  message: string;
  shortfallPercent: number;
  consecutiveDays: number;
  agreementHeadcount: number;
  plannedHeadcount: number;
  actualHeadcount: number;
  skillGaps: Array<SkillGapInput & { missing: boolean }>;
  expectedScheduleImpactDays: number;
  recommendedEscalation: ManpowerEscalation;
};

/**
 * Evaluate alert rules for a contractor on asOf using prior daily observations
 * (oldest → newest, last entry = asOf).
 */
export function resolveShortfallAlerts(input: {
  observations: DailyManpowerObservation[];
  workProgress?: {
    behind: boolean;
    progressShortfallPercent: number;
    expectedScheduleImpactDays: number;
  };
}): ResolvedShortfallAlert[] {
  if (!input.observations.length) return [];
  const latest = input.observations[input.observations.length - 1];
  const expected = Math.max(latest.plannedHeadcount, latest.agreementHeadcount);
  const fillRatesVsPlan = input.observations.map((obs) =>
    fillRatePercent(
      obs.actualHeadcount,
      Math.max(obs.plannedHeadcount, obs.agreementHeadcount, 1),
    ),
  );
  const shortfall = shortfallPercent(latest.actualHeadcount, expected || 1);
  const streak80 = countConsecutiveDaysBelow(fillRatesVsPlan, 80);
  const streak60 = countConsecutiveDaysBelow(fillRatesVsPlan, 60);
  const missing = missingCriticalSkills(latest.skillGaps);
  const alerts: ResolvedShortfallAlert[] = [];

  const skillGapsWithMissing = latest.skillGaps.map((gap) => ({
    ...gap,
    missing:
      gap.isCritical &&
      (gap.plannedHeadcount > 0 || gap.committedHeadcount > 0) &&
      gap.actualHeadcount <= 0,
  }));

  if (!latest.attendanceSubmitted) {
    const type = ManpowerShortfallAlertType.NoAttendanceSubmitted;
    alerts.push({
      alertType: type,
      message: `No labour attendance submitted (expected ${expected} workers)`,
      shortfallPercent: expected > 0 ? 100 : 0,
      consecutiveDays: countConsecutiveMissingAttendance(input.observations),
      agreementHeadcount: latest.agreementHeadcount,
      plannedHeadcount: latest.plannedHeadcount,
      actualHeadcount: latest.actualHeadcount,
      skillGaps: skillGapsWithMissing,
      expectedScheduleImpactDays: estimateManpowerScheduleImpact({
        shortfallPercent: expected > 0 ? 100 : 0,
        consecutiveDays: 1,
      }),
      recommendedEscalation: recommendEscalation(type),
    });
  }

  if (streak80 >= 2) {
    const type = ManpowerShortfallAlertType.Below80TwoConsecutiveDays;
    alerts.push({
      alertType: type,
      message: `Manpower below 80% of plan for ${streak80} consecutive day(s) (${shortfall}% shortfall)`,
      shortfallPercent: shortfall,
      consecutiveDays: streak80,
      agreementHeadcount: latest.agreementHeadcount,
      plannedHeadcount: latest.plannedHeadcount,
      actualHeadcount: latest.actualHeadcount,
      skillGaps: skillGapsWithMissing,
      expectedScheduleImpactDays: estimateManpowerScheduleImpact({
        shortfallPercent: shortfall,
        consecutiveDays: streak80,
      }),
      recommendedEscalation: recommendEscalation(type),
    });
  }

  if (streak60 >= 3) {
    const type = ManpowerShortfallAlertType.Below60ThreeDays;
    alerts.push({
      alertType: type,
      message: `Manpower below 60% of plan for ${streak60} consecutive day(s) (${shortfall}% shortfall)`,
      shortfallPercent: shortfall,
      consecutiveDays: streak60,
      agreementHeadcount: latest.agreementHeadcount,
      plannedHeadcount: latest.plannedHeadcount,
      actualHeadcount: latest.actualHeadcount,
      skillGaps: skillGapsWithMissing,
      expectedScheduleImpactDays: estimateManpowerScheduleImpact({
        shortfallPercent: shortfall,
        consecutiveDays: streak60,
      }),
      recommendedEscalation: recommendEscalation(type),
    });
  }

  if (missing.length > 0 && latest.attendanceSubmitted) {
    const type = ManpowerShortfallAlertType.MissingCriticalSkill;
    const names = missing.map((m) => m.skill).join(', ');
    alerts.push({
      alertType: type,
      message: `Missing critical skill(s): ${names}`,
      shortfallPercent: shortfall,
      consecutiveDays: 1,
      agreementHeadcount: latest.agreementHeadcount,
      plannedHeadcount: latest.plannedHeadcount,
      actualHeadcount: latest.actualHeadcount,
      skillGaps: skillGapsWithMissing,
      expectedScheduleImpactDays: Math.max(
        1,
        estimateManpowerScheduleImpact({
          shortfallPercent: Math.max(shortfall, 50),
          consecutiveDays: 1,
        }),
      ),
      recommendedEscalation: recommendEscalation(type),
    });
  }

  if (input.workProgress?.behind) {
    const type = ManpowerShortfallAlertType.WorkProgressBehindPlan;
    alerts.push({
      alertType: type,
      message: `Work progress behind plan (${input.workProgress.progressShortfallPercent}% behind expected)`,
      shortfallPercent: input.workProgress.progressShortfallPercent,
      consecutiveDays: 1,
      agreementHeadcount: latest.agreementHeadcount,
      plannedHeadcount: latest.plannedHeadcount,
      actualHeadcount: latest.actualHeadcount,
      skillGaps: skillGapsWithMissing,
      expectedScheduleImpactDays:
        input.workProgress.expectedScheduleImpactDays,
      recommendedEscalation: recommendEscalation(type),
    });
  }

  return alerts;
}

function countConsecutiveMissingAttendance(
  observations: DailyManpowerObservation[],
): number {
  let streak = 0;
  for (let i = observations.length - 1; i >= 0; i -= 1) {
    if (!observations[i].attendanceSubmitted) streak += 1;
    else break;
  }
  return streak;
}
