import { GSTIN_REGEX, IFSC_REGEX, PAN_REGEX } from '@luxaria/shared-validation';
import { z } from 'zod';

/** Categories: lowercase alphanumeric with `_` / `-` (Nest MATERIAL_CATEGORY_REGEX). */
const MATERIAL_CATEGORY_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/**
 * Form-friendly schema (string fields only — no transforms that widen/narrow
 * types for react-hook-form + zodResolver).
 */
export const vendorCreateSchema = z
  .object({
    legalName: z.string().trim().min(1, 'Legal name is required').max(200),
    tradeName: z.string(),
    pan: z.string(),
    gstin: z.string(),
    email: z.string(),
    phone: z.string(),
    contactPerson: z.string(),
    materialCategoriesText: z.string(),
    paymentTerms: z.string(),
    rating: z.string(),
    ifsc: z.string(),
    accountNumber: z.string(),
    bankName: z.string(),
  })
  .superRefine((values, ctx) => {
    const pan = values.pan.trim();
    if (pan && !PAN_REGEX.test(pan.toUpperCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pan'],
        message: 'PAN must be a valid PAN (e.g. ABCDE1234F)',
      });
    }
    const gstin = values.gstin.trim();
    if (gstin && !GSTIN_REGEX.test(gstin.toUpperCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstin'],
        message: 'GSTIN must be a valid GSTIN',
      });
    }
    const email = values.email.trim();
    if (email && !z.string().email().safeParse(email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Enter a valid email',
      });
    }
    const cats = parseMaterialCategories(values.materialCategoriesText);
    if (!cats.every((c) => MATERIAL_CATEGORY_REGEX.test(c))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['materialCategoriesText'],
        message:
          'Categories must be lowercase alphanumeric with _ or - (comma-separated)',
      });
    }
    const rating = values.rating.trim();
    if (rating) {
      const n = Number(rating);
      if (!Number.isFinite(n) || n < 0 || n > 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rating'],
          message: 'Rating must be between 0 and 5',
        });
      }
    }
    const ifsc = values.ifsc.trim();
    if (ifsc && !IFSC_REGEX.test(ifsc.toUpperCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ifsc'],
        message: 'IFSC must be a valid IFSC',
      });
    }
    const account = values.accountNumber.replace(/\s+/g, '');
    if (account && !/^\d{9,18}$/.test(account)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountNumber'],
        message: 'Account number must be 9–18 digits',
      });
    }
  });

export type VendorCreateFormValues = z.infer<typeof vendorCreateSchema>;

export function emptyVendorCreateForm(): VendorCreateFormValues {
  return {
    legalName: '',
    tradeName: '',
    pan: '',
    gstin: '',
    email: '',
    phone: '',
    contactPerson: '',
    materialCategoriesText: '',
    paymentTerms: '',
    rating: '',
    ifsc: '',
    accountNumber: '',
    bankName: '',
  };
}

export function parseMaterialCategories(
  value: string | null | undefined,
): string[] {
  if (value == null || value.trim() === '') return [];
  return [
    ...new Set(
      value
        .split(',')
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function parseOptionalRating(
  value: string | null | undefined,
): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function optionalTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function isValidPan(value: string | null | undefined): boolean {
  if (value == null || value.trim() === '') return true;
  return PAN_REGEX.test(value.trim().toUpperCase());
}

export function isValidGstin(value: string | null | undefined): boolean {
  if (value == null || value.trim() === '') return true;
  return GSTIN_REGEX.test(value.trim().toUpperCase());
}
