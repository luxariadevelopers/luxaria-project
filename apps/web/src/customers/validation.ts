import { z } from 'zod';
import { PAN_REGEX } from '@luxaria/shared-validation';
import { CustomerFundingType } from './types';

/** Backend `AADHAAR_REGEX` — customers.validation.ts */
export const AADHAAR_REGEX = /^\d{12}$/;

/** Product convention — Indian 10-digit mobile (shared-validation). */
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

const optionalPan = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v.trim() === '') return null;
    return v.trim().toUpperCase();
  })
  .refine((v) => v === undefined || v === null || PAN_REGEX.test(v), {
    message: 'PAN must be a valid PAN (e.g. ABCDE1234F)',
  });

const optionalAadhaar = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v.trim() === '') return null;
    return v.replace(/[\s-]/g, '');
  })
  .refine((v) => v === undefined || v === null || AADHAAR_REGEX.test(v), {
    message: 'Aadhaar must be a 12-digit number',
  });

const optionalEmail = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v.trim() === '') return null;
    return v.trim().toLowerCase();
  })
  .refine(
    (v) =>
      v === undefined ||
      v === null ||
      z.string().email().safeParse(v).success,
    { message: 'Enter a valid email' },
  );

const optionalPhone = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v.trim() === '') return null;
    return v.replace(/[\s-]/g, '');
  })
  .refine(
    (v) =>
      v === undefined || v === null || INDIAN_MOBILE_REGEX.test(v),
    { message: 'Phone must be a 10-digit Indian mobile number' },
  );

const optionalText = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v.trim() === '') return null;
    return v.trim();
  });

export const customerCreateSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required'),
    pan: optionalPan,
    aadhaar: optionalAadhaar,
    email: optionalEmail,
    phone: optionalPhone,
    alternatePhone: optionalPhone,
    occupation: optionalText,
    fundingType: z.enum([
      CustomerFundingType.OwnFunds,
      CustomerFundingType.BankLoan,
      CustomerFundingType.Mixed,
    ]),
    loanBank: optionalText,
    addressLine1: optionalText,
    city: optionalText,
    state: optionalText,
    pincode: optionalText,
    jointFullName: optionalText,
    jointRelationship: optionalText,
    jointPan: optionalPan,
    jointAadhaar: optionalAadhaar,
    jointPhone: optionalPhone,
    jointEmail: optionalEmail,
  })
  .superRefine((values, ctx) => {
    const needsBank =
      values.fundingType === CustomerFundingType.BankLoan ||
      values.fundingType === CustomerFundingType.Mixed;
    if (needsBank && !values.loanBank) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['loanBank'],
        message: 'Loan bank is required for bank loan or mixed funding',
      });
    }
    if (
      values.fundingType === CustomerFundingType.OwnFunds &&
      values.loanBank
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['loanBank'],
        message: 'Loan bank must be empty for own funds',
      });
    }
  });

export type CustomerCreateFormValues = z.infer<typeof customerCreateSchema>;

export function isValidPan(value: string | null | undefined): boolean {
  if (value == null || value.trim() === '') return true;
  return PAN_REGEX.test(value.trim().toUpperCase());
}

export function isValidAadhaar(value: string | null | undefined): boolean {
  if (value == null || value.trim() === '') return true;
  const digits = value.replace(/[\s-]/g, '');
  return AADHAAR_REGEX.test(digits);
}

export function isValidContactPhone(value: string | null | undefined): boolean {
  if (value == null || value.trim() === '') return true;
  const digits = value.replace(/[\s-]/g, '');
  return INDIAN_MOBILE_REGEX.test(digits);
}
