import { EMPTY_DISPLAY, type EmptyDisplayOptions } from './nullish';

/** Company / India default timezone (IST). */
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export type DateInput = Date | string | number | null | undefined;

export type DateFormatOptions = EmptyDisplayOptions & {
  /** IANA timezone. Default `Asia/Kolkata`. */
  timeZone?: string;
};

function parseDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format a calendar date in IST (or given TZ): `20 Jul 2026`.
 */
export function formatDate(
  value: DateInput,
  options: DateFormatOptions = {},
): string {
  const d = parseDate(value);
  if (!d) {
    return options.empty ?? EMPTY_DISPLAY;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: options.timeZone ?? DEFAULT_TIMEZONE,
  }).format(d);
}

/**
 * Format date + time in IST: `20 Jul 2026, 3:45 pm`.
 */
export function formatDateTime(
  value: DateInput,
  options: DateFormatOptions = {},
): string {
  const d = parseDate(value);
  if (!d) {
    return options.empty ?? EMPTY_DISPLAY;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: options.timeZone ?? DEFAULT_TIMEZONE,
  }).format(d);
}

/**
 * Format time only in IST: `3:45 pm`.
 */
export function formatTime(
  value: DateInput,
  options: DateFormatOptions = {},
): string {
  const d = parseDate(value);
  if (!d) {
    return options.empty ?? EMPTY_DISPLAY;
  }

  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: options.timeZone ?? DEFAULT_TIMEZONE,
  }).format(d);
}

/**
 * ISO calendar date (YYYY-MM-DD) in the given timezone — useful for API query params.
 * Invalid/null → empty string (not `—`) so callers can omit the field.
 */
export function toIsoDateString(
  value: DateInput,
  options: DateFormatOptions = {},
): string {
  const d = parseDate(value);
  if (!d) {
    return '';
  }

  const timeZone = options.timeZone ?? DEFAULT_TIMEZONE;
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(d);
}
