import { z } from 'zod';
import { INDIAN_MOBILE_DIGITS_REGEX } from './constants';

/**
 * Email — matches `@IsEmail()` usage on user / auth DTOs.
 * Empty string / null → null for optional fields.
 */
export const emailSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}, z.string().email('Must be a valid email').nullable());

export const emailRequiredSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Must be a valid email');

/**
 * Indian 10-digit mobile (product convention from API examples).
 * Digits-only; leading country code not accepted here.
 */
export const mobileSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return value;
  const digits = value.replace(/[\s-]/g, '');
  return digits.length === 0 ? null : digits;
}, z.string().regex(INDIAN_MOBILE_DIGITS_REGEX, 'Mobile must be a 10-digit Indian number').nullable());

export const mobileRequiredSchema = z
  .string()
  .trim()
  .regex(INDIAN_MOBILE_DIGITS_REGEX, 'Mobile must be a 10-digit Indian number');
