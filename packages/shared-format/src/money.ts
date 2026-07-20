import { EMPTY_DISPLAY, toFiniteNumber, type EmptyDisplayOptions } from './nullish';

export type InrFormatOptions = EmptyDisplayOptions & {
  /**
   * Fraction digits for INR display.
   * Default 2 (matches backend `roundMoney` / money DTO precision).
   */
  fractionDigits?: number;
  /** When true, omit the ₹ currency symbol (Indian grouping only). */
  compact?: boolean;
};

/**
 * Format an amount in Indian Rupees with `en-IN` currency style.
 * Handles null → `—`, zero → `₹0.00`, negatives → `₹-1,234.56`.
 *
 * Amounts are expected in **rupees** (not paise), matching Nest money fields.
 */
export function formatInr(value: unknown, options: InrFormatOptions = {}): string {
  const n = toFiniteNumber(value);
  if (n === null) {
    return options.empty ?? EMPTY_DISPLAY;
  }

  const fractionDigits = options.fractionDigits ?? 2;

  if (options.compact) {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(n);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}
