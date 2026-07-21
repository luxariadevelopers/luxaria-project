import { GSTIN_REGEX, IFSC_REGEX, PAN_REGEX } from '@luxaria/shared-validation';
import { z } from 'zod';
import { ContractorType } from './types';

const WORK_CATEGORY_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export const contractorCreateSchema = z
  .object({
    legalName: z.string().trim().min(1, 'Legal name is required').max(200),
    tradeName: z.string(),
    contractorType: z.enum(
      Object.values(ContractorType) as [string, ...string[]],
    ),
    pan: z.string(),
    gstin: z.string(),
    email: z.string(),
    phone: z.string(),
    contactPerson: z.string(),
    workCategoriesText: z.string(),
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
    const cats = parseWorkCategories(values.workCategoriesText);
    if (!cats.every((c) => WORK_CATEGORY_REGEX.test(c))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['workCategoriesText'],
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
  });

export type ContractorCreateFormValues = z.infer<typeof contractorCreateSchema>;

export function emptyContractorCreateForm(): ContractorCreateFormValues {
  return {
    legalName: '',
    tradeName: '',
    contractorType: ContractorType.Civil,
    pan: '',
    gstin: '',
    email: '',
    phone: '',
    contactPerson: '',
    workCategoriesText: '',
    rating: '',
    ifsc: '',
    accountNumber: '',
    bankName: '',
  };
}

export function optionalTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseWorkCategories(text: string): string[] {
  return text
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function parseOptionalRating(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
