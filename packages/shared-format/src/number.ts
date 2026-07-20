import { EMPTY_DISPLAY, toFiniteNumber, type EmptyDisplayOptions } from './nullish';

export type IndianNumberOptions = EmptyDisplayOptions & {
  /** Minimum fraction digits (default 0). */
  minimumFractionDigits?: number;
  /** Maximum fraction digits (default 2). */
  maximumFractionDigits?: number;
};

/**
 * Format a number with Indian grouping (e.g. 12,34,567.89) via `en-IN`.
 * Null/invalid → empty placeholder. Zero and negatives are preserved.
 */
export function formatIndianNumber(
  value: unknown,
  options: IndianNumberOptions = {},
): string {
  const n = toFiniteNumber(value);
  if (n === null) {
    return options.empty ?? EMPTY_DISPLAY;
  }

  const minimumFractionDigits = options.minimumFractionDigits ?? 0;
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;

  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(n);
}
