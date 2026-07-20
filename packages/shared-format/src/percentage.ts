import { EMPTY_DISPLAY, toFiniteNumber, type EmptyDisplayOptions } from './nullish';

export type PercentageFormatOptions = EmptyDisplayOptions & {
  /** Fraction digits (default 2). */
  fractionDigits?: number;
};

/**
 * Format a percentage value (0–100 scale as stored in APIs).
 * Example: `12.5` → `12.50%`. Null → `—`. Negative values are shown as-is.
 */
export function formatPercentage(
  value: unknown,
  options: PercentageFormatOptions = {},
): string {
  const n = toFiniteNumber(value);
  if (n === null) {
    return options.empty ?? EMPTY_DISPLAY;
  }

  const fractionDigits = options.fractionDigits ?? 2;
  const body = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);

  return `${body}%`;
}
