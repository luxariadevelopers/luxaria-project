import type { PublicPettyCashRequirement } from './types';

/** Client-only week filter (Nest list has project / account / status only). */
export type PettyCashRequestClientFilters = {
  /** ISO date `YYYY-MM-DD` matching `weekStartDate` day, or empty. */
  weekStartDate: string;
};

export function hasPettyCashRequestClientFilters(
  filters: PettyCashRequestClientFilters,
): boolean {
  return Boolean(filters.weekStartDate.trim());
}

function toDateKey(value: string): string {
  return value.slice(0, 10);
}

/**
 * Filter listed requirements by week start after fetch.
 */
export function applyPettyCashRequestClientFilters(
  rows: readonly PublicPettyCashRequirement[],
  filters: PettyCashRequestClientFilters,
): PublicPettyCashRequirement[] {
  const week = filters.weekStartDate.trim();
  if (!week) return [...rows];
  const key = toDateKey(week);
  return rows.filter((row) => toDateKey(row.weekStartDate) === key);
}
