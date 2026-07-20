import { z } from 'zod';
import { MONEY_EPS } from './constants';

/** Mirrors `roundMoney` in journal / DPR validation (2 decimal places). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function moneyEquals(a: number, b: number): boolean {
  return Math.abs(roundMoney(a) - roundMoney(b)) < MONEY_EPS;
}

/** Finite money amount (may be negative — e.g. adjustments). */
export const moneyAmountSchema = z
  .number({
    required_error: 'Amount is required',
    invalid_type_error: 'Amount must be a number',
  })
  .finite('Amount must be a finite number');

/** Non-negative money (capital, rates, line amounts with `@Min(0)`). */
export const moneyNonNegativeSchema = moneyAmountSchema.min(
  0,
  'Amount must be ≥ 0',
);

/** Optional / nullable money for partial updates. */
export const moneyOptionalSchema = moneyAmountSchema.optional().nullable();

export const moneyNonNegativeOptionalSchema = moneyNonNegativeSchema
  .optional()
  .nullable();

/** Percentage 0–100 (booking discount %, TDS retention, etc.). */
export const percentageSchema = z
  .number()
  .finite()
  .min(0, 'Percentage must be ≥ 0')
  .max(100, 'Percentage must be ≤ 100');

export type MoneyAmount = z.infer<typeof moneyAmountSchema>;
