import { z } from 'zod';
import { ACCOUNT_NUMBER_DIGITS_REGEX, IFSC_REGEX } from './constants';

export function normalizeIfsc(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizeAccountNumber(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const digits = value.replace(/\s+/g, '');
  return digits.length === 0 ? null : digits;
}

export const ifscSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return value;
  return normalizeIfsc(value);
}, z.string().regex(IFSC_REGEX, 'Invalid IFSC format').nullable());

export const ifscRequiredSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(IFSC_REGEX, 'Invalid IFSC format');

export const bankAccountNumberSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return value;
  return normalizeAccountNumber(value);
}, z
  .string()
  .regex(ACCOUNT_NUMBER_DIGITS_REGEX, 'accountNumber must be 9–18 digits')
  .nullable());

export const bankAccountNumberRequiredSchema = z
  .string()
  .trim()
  .regex(ACCOUNT_NUMBER_DIGITS_REGEX, 'accountNumber must be 9–18 digits');
