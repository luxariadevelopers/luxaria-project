import { z } from 'zod';
import { ISO_DATE_ONLY_REGEX } from './constants';

/**
 * ISO-8601 datetime string (`z.string().datetime()`), matching API timestamps.
 */
export const isoDateTimeSchema = z
  .string()
  .datetime({ message: 'Must be a valid ISO-8601 datetime' });

/**
 * Calendar date `YYYY-MM-DD` used for DPR reportDate keys and similar fields.
 */
export const isoDateOnlySchema = z
  .string()
  .regex(ISO_DATE_ONLY_REGEX, 'Must be a date in YYYY-MM-DD format');

/**
 * Accepts ISO date or datetime strings that `Date.parse` can read
 * (class-validator `@IsDateString()` family).
 */
export const isoDateStringSchema = z
  .string()
  .min(1, 'Date is required')
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Must be a valid date string',
  });

export const isoDateStringOptionalSchema = isoDateStringSchema
  .optional()
  .nullable();

/** Normalize to UTC midnight (mirrors DPR `normalizeReportDate`). */
export function normalizeUtcDateOnly(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function reportDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
