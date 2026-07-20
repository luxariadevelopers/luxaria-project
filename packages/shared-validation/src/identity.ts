import { z } from 'zod';
import { CIN_REGEX, GSTIN_REGEX, PAN_REGEX, TAN_REGEX } from './constants';

/** Uppercase + trim empty → null (mirrors `normalizeOptionalCode`). */
export function normalizeOptionalCode(
  value?: string | null,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim().toUpperCase();
  return trimmed.length === 0 ? null : trimmed;
}

const codePreprocessor = (value: unknown) => {
  if (typeof value !== 'string') return value;
  return normalizeOptionalCode(value);
};

export const panSchema = z.preprocess(
  codePreprocessor,
  z
    .string()
    .regex(PAN_REGEX, 'Invalid PAN format')
    .nullable(),
);

export const gstinSchema = z.preprocess(
  codePreprocessor,
  z
    .string()
    .regex(GSTIN_REGEX, 'Invalid GSTIN format')
    .nullable(),
);

export const tanSchema = z.preprocess(
  codePreprocessor,
  z
    .string()
    .regex(TAN_REGEX, 'Invalid TAN format')
    .nullable(),
);

export const cinSchema = z.preprocess(
  codePreprocessor,
  z
    .string()
    .regex(CIN_REGEX, 'Invalid CIN format')
    .nullable(),
);

/** Required (non-null) variants for forms that always collect the field. */
export const panRequiredSchema = z.string().trim().toUpperCase().regex(PAN_REGEX, 'Invalid PAN format');
export const gstinRequiredSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(GSTIN_REGEX, 'Invalid GSTIN format');
