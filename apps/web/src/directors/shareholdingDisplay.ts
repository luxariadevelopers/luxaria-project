/**
 * Mirrors backend seed: `PERCENTAGE_PER_DIRECTOR` in
 * `apps/backend/src/modules/directors/directors.seed.ts`
 * (four placeholder directors at equal company equity).
 */
export const SEED_SHAREHOLDING_PERCENT_PER_DIRECTOR = 25;

export function formatShareholdingPercent(percentage: number): string {
  if (!Number.isFinite(percentage)) {
    return '—';
  }
  const rounded =
    Math.abs(percentage - Math.round(percentage)) < 0.0001
      ? Math.round(percentage)
      : Math.round(percentage * 100) / 100;
  return `${rounded}%`;
}

export function holdingForDirector<T extends { directorId: string }>(
  holdings: readonly T[],
  directorId: string,
): T | undefined {
  return holdings.find((h) => h.directorId === directorId);
}

export function isSeedEqualShare(percentage: number): boolean {
  return Math.abs(percentage - SEED_SHAREHOLDING_PERCENT_PER_DIRECTOR) < 0.0001;
}
