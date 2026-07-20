import { EMPTY_DISPLAY, toFiniteNumber, type EmptyDisplayOptions } from './nullish';

export type QuantityFormatOptions = EmptyDisplayOptions & {
  /**
   * Max decimal places (default 6 — matches shared qty / DPR precision).
   * Trailing zeros are trimmed for display unless `fixed` is true.
   */
  maximumFractionDigits?: number;
  /** When true, always show exactly `maximumFractionDigits` decimals. */
  fixed?: boolean;
};

/**
 * Format a quantity with Indian grouping.
 * Zero → `0`, null → `—`, negatives preserved.
 */
export function formatQuantity(
  value: unknown,
  options: QuantityFormatOptions = {},
): string {
  const n = toFiniteNumber(value);
  if (n === null) {
    return options.empty ?? EMPTY_DISPLAY;
  }

  const maximumFractionDigits = options.maximumFractionDigits ?? 6;

  if (options.fixed) {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: maximumFractionDigits,
      maximumFractionDigits,
    }).format(n);
  }

  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(n);
}
