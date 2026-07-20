import type { PublicShareholding } from '@/directors/types';

export type ShareholdingIntervalOverlap = {
  directorId: string;
  a: PublicShareholding;
  b: PublicShareholding;
  message: string;
};

function toTime(value: string | null | undefined, openEnd: boolean): number {
  if (value == null || value === '') {
    return openEnd ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  const t = Date.parse(value);
  return Number.isNaN(t) ? Number.NaN : t;
}

/**
 * Half-open interval [effectiveFrom, effectiveTo) — null `effectiveTo` is open.
 * Two ranges overlap when they intersect on the timeline for the same director.
 */
export function intervalsOverlap(
  aFrom: string,
  aTo: string | null,
  bFrom: string,
  bTo: string | null,
): boolean {
  const aStart = toTime(aFrom, false);
  const aEnd = toTime(aTo, true);
  const bStart = toTime(bFrom, false);
  const bEnd = toTime(bTo, true);
  if (
    [aStart, aEnd, bStart, bEnd].some((n) => Number.isNaN(n))
  ) {
    return false;
  }
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Detect overlapping effective-date ranges in versioned history.
 * Healthy Nest data closes prior rows before inserting the next version —
 * overlaps surface as client validation errors for auditors.
 */
export function findOverlappingEffectiveDates(
  holdings: readonly PublicShareholding[],
): ShareholdingIntervalOverlap[] {
  const byDirector = new Map<string, PublicShareholding[]>();
  for (const row of holdings) {
    const list = byDirector.get(row.directorId) ?? [];
    list.push(row);
    byDirector.set(row.directorId, list);
  }

  const overlaps: ShareholdingIntervalOverlap[] = [];
  for (const [directorId, rows] of byDirector) {
    const sorted = [...rows].sort(
      (x, y) => Date.parse(x.effectiveFrom) - Date.parse(y.effectiveFrom),
    );
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const a = sorted[i]!;
        const b = sorted[j]!;
        if (
          intervalsOverlap(
            a.effectiveFrom,
            a.effectiveTo,
            b.effectiveFrom,
            b.effectiveTo,
          )
        ) {
          overlaps.push({
            directorId,
            a,
            b,
            message: `Overlapping effective dates for director ${directorId.slice(-8)} (versions ${a.version} & ${b.version})`,
          });
        }
      }
    }
  }
  return overlaps;
}
