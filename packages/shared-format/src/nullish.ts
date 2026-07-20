/** Default empty cell / placeholder used across web + mobile lists. */
export const EMPTY_DISPLAY = '—';

/**
 * Coerce unknown input to a finite number, or null when missing/invalid.
 * Accepts numeric strings (commas stripped).
 */
export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/,/g, '');
    if (normalized.length === 0) return null;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type EmptyDisplayOptions = {
  /** Shown when value is null/undefined/invalid. Default `—`. */
  empty?: string;
};
