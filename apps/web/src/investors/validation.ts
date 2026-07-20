import { z } from 'zod';
import { InvestorType } from './types';

/** Backend `PAN_REGEX` — company.validation.ts */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Backend `GSTIN_REGEX` */
export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Backend `CIN_REGEX` */
export const CIN_REGEX = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

/** Backend `IFSC_REGEX` — investors.validation.ts */
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const optionalCode = (regex: RegExp, message: string) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null || v.trim() === '') return null;
      return v.trim().toUpperCase();
    })
    .refine((v) => v === undefined || v === null || regex.test(v), {
      message,
    });

export const investorCreateSchema = z
  .object({
    investorType: z.enum([
      InvestorType.Individual,
      InvestorType.Company,
      InvestorType.Partnership,
      InvestorType.Trust,
      InvestorType.DirectorAsProjectInvestor,
    ]),
    legalName: z.string().trim().min(1, 'Legal name is required'),
    pan: optionalCode(PAN_REGEX, 'PAN must be a valid PAN (e.g. ABCDE1234F)'),
    gstin: optionalCode(GSTIN_REGEX, 'GSTIN must be a valid GSTIN'),
    cin: optionalCode(CIN_REGEX, 'CIN must be a valid CIN'),
    directorId: z
      .string()
      .optional()
      .nullable()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null || v.trim() === '') return null;
        return v.trim();
      }),
    email: z
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
      ),
    phone: z
      .string()
      .optional()
      .nullable()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null || v.trim() === '') return null;
        return v.trim();
      }),
    ifsc: optionalCode(IFSC_REGEX, 'IFSC must be a valid IFSC'),
    accountNumber: z
      .string()
      .optional()
      .nullable()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null || v.trim() === '') return null;
        return v.replace(/\s+/g, '');
      })
      .refine(
        (v) =>
          v === undefined || v === null || /^\d{9,18}$/.test(v),
        { message: 'Account number must be 9–18 digits' },
      ),
    bankName: z
      .string()
      .optional()
      .nullable()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null || v.trim() === '') return null;
        return v.trim();
      }),
  })
  .superRefine((values, ctx) => {
    if (values.investorType === InvestorType.Company && !values.cin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cin'],
        message: 'CIN is required for company investors',
      });
    }
    if (
      values.investorType === InvestorType.DirectorAsProjectInvestor &&
      !values.directorId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['directorId'],
        message:
          'Director is required when type is director as project investor',
      });
    }
  });

export type InvestorCreateFormValues = z.infer<typeof investorCreateSchema>;

export function isValidPan(value: string | null | undefined): boolean {
  if (value == null || value.trim() === '') return true;
  return PAN_REGEX.test(value.trim().toUpperCase());
}

export function isValidGstin(value: string | null | undefined): boolean {
  if (value == null || value.trim() === '') return true;
  return GSTIN_REGEX.test(value.trim().toUpperCase());
}

export function isValidCin(value: string | null | undefined): boolean {
  if (value == null || value.trim() === '') return true;
  return CIN_REGEX.test(value.trim().toUpperCase());
}
