import type { FieldPath } from 'react-hook-form';
import { z } from 'zod';
import { COMPANY_LOGO_MAX_BYTES, COMPANY_LOGO_MIME_TYPES } from './constants';
import {
  CompanyCapitalType,
  type PublicCompany,
  type UpdateCapitalInput,
  type UpdateCompanyInput,
  type UpdateStatutoryInput,
} from './types';

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const CIN_REGEX = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
export const INDIAN_PIN_REGEX = /^[1-9][0-9]{5}$/;

const addressSchema = z.object({
  line1: z.string().trim().min(1, 'Address line 1 is required'),
  line2: z.string(),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  pincode: z.string().trim().regex(INDIAN_PIN_REGEX, 'Enter a valid 6-digit Indian PIN'),
  country: z.string().trim().min(1, 'Country is required'),
});

export const companyProfileFormSchema = z.object({
  tradeName: z.string().trim().min(1, 'Trade name is required'),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || z.string().email().safeParse(value).success,
      'Enter a valid email address',
    ),
  phone: z.string(),
  website: z.string(),
  financialYearStartMonth: z
    .number()
    .int()
    .min(1, 'Select a valid month')
    .max(12, 'Select a valid month'),
  registeredAddress: addressSchema,
  corporateAddress: addressSchema,
  addressChangeReason: z.string(),
});

export type CompanyProfileFormValues = z.infer<typeof companyProfileFormSchema>;

function optionalCode(regex: RegExp, message: string) {
  return z
    .string()
    .transform((value) => value.trim().toUpperCase())
    .refine((value) => value === '' || regex.test(value), message);
}

export const companyStatutoryFormSchema = z.object({
  legalName: z.string().trim().min(1, 'Legal name is required'),
  cin: optionalCode(CIN_REGEX, 'Enter a valid CIN'),
  pan: optionalCode(PAN_REGEX, 'Enter a valid PAN'),
  tan: optionalCode(TAN_REGEX, 'Enter a valid TAN'),
  gstin: optionalCode(GSTIN_REGEX, 'Enter a valid GSTIN'),
});

export type CompanyStatutoryFormValues = z.infer<typeof companyStatutoryFormSchema>;

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const capitalTypes = Object.values(CompanyCapitalType) as [
  CompanyCapitalType,
  ...CompanyCapitalType[],
];

const capitalBaseSchema = z.object({
  capitalType: z.enum(capitalTypes),
  newAmount: z
    .number()
    .finite('Enter a valid amount')
    .nonnegative('Capital cannot be negative')
    .nullable()
    .refine((value): boolean => value !== null, 'New capital amount is required')
    .refine(
      (value) => value === null || Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
      'Capital can have at most 2 decimal places',
    ),
  effectiveFrom: z
    .string()
    .refine(
      (value) => value.trim() === '' || isCalendarDate(value),
      'Enter a valid effective date',
    ),
  changeReason: z.string(),
  reference: z.string(),
});

export type CompanyCapitalFormValues = z.infer<typeof capitalBaseSchema>;

export function buildCompanyCapitalFormSchema(
  company: Pick<PublicCompany, 'authorisedShareCapital' | 'paidUpShareCapital'>,
) {
  return capitalBaseSchema.superRefine((values, context) => {
    if (values.newAmount === null) return;

    const currentAmount =
      values.capitalType === CompanyCapitalType.Authorised
        ? company.authorisedShareCapital
        : company.paidUpShareCapital;
    if (values.newAmount === currentAmount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newAmount'],
        message: 'New amount must differ from the current amount',
      });
    }

    const nextAuthorised =
      values.capitalType === CompanyCapitalType.Authorised
        ? values.newAmount
        : company.authorisedShareCapital;
    const nextPaidUp =
      values.capitalType === CompanyCapitalType.PaidUp
        ? values.newAmount
        : company.paidUpShareCapital;
    if (nextPaidUp > nextAuthorised) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newAmount'],
        message:
          values.capitalType === CompanyCapitalType.Authorised
            ? 'Authorised capital cannot be below current paid-up capital'
            : 'Paid-up capital cannot exceed authorised capital',
      });
    }
  });
}

function optionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildCompanyProfileDefaults(company: PublicCompany): CompanyProfileFormValues {
  return {
    tradeName: company.tradeName,
    email: company.email ?? '',
    phone: company.phone ?? '',
    website: company.website ?? '',
    financialYearStartMonth: company.financialYearStartMonth,
    registeredAddress: {
      ...company.registeredAddress,
      line2: company.registeredAddress.line2 ?? '',
    },
    corporateAddress: {
      ...company.corporateAddress,
      line2: company.corporateAddress.line2 ?? '',
    },
    addressChangeReason: '',
  };
}

export function toUpdateCompanyInput(values: CompanyProfileFormValues): UpdateCompanyInput {
  return {
    tradeName: values.tradeName.trim(),
    email: optionalString(values.email)?.toLowerCase() ?? null,
    phone: optionalString(values.phone),
    website: optionalString(values.website),
    financialYearStartMonth: values.financialYearStartMonth,
    registeredAddress: {
      line1: values.registeredAddress.line1.trim(),
      line2: optionalString(values.registeredAddress.line2),
      city: values.registeredAddress.city.trim(),
      state: values.registeredAddress.state.trim(),
      pincode: values.registeredAddress.pincode.trim(),
      country: values.registeredAddress.country.trim(),
    },
    corporateAddress: {
      line1: values.corporateAddress.line1.trim(),
      line2: optionalString(values.corporateAddress.line2),
      city: values.corporateAddress.city.trim(),
      state: values.corporateAddress.state.trim(),
      pincode: values.corporateAddress.pincode.trim(),
      country: values.corporateAddress.country.trim(),
    },
    addressChangeReason: optionalString(values.addressChangeReason),
  };
}

export function buildCompanyStatutoryDefaults(company: PublicCompany): CompanyStatutoryFormValues {
  return {
    legalName: company.legalName,
    cin: company.cin ?? '',
    pan: company.pan ?? '',
    tan: company.tan ?? '',
    gstin: company.gstin ?? '',
  };
}

export function toUpdateStatutoryInput(values: CompanyStatutoryFormValues): UpdateStatutoryInput {
  return {
    legalName: values.legalName.trim(),
    cin: optionalString(values.cin)?.toUpperCase() ?? null,
    pan: optionalString(values.pan)?.toUpperCase() ?? null,
    tan: optionalString(values.tan)?.toUpperCase() ?? null,
    gstin: optionalString(values.gstin)?.toUpperCase() ?? null,
  };
}

export function toUpdateCapitalInput(values: CompanyCapitalFormValues): UpdateCapitalInput {
  if (values.newAmount === null) {
    throw new Error('New capital amount is required');
  }
  return {
    capitalType: values.capitalType,
    newAmount: values.newAmount,
    effectiveFrom: values.effectiveFrom.trim() || undefined,
    changeReason: optionalString(values.changeReason),
    reference: optionalString(values.reference),
  };
}

const profileFields = new Set<FieldPath<CompanyProfileFormValues>>([
  'tradeName',
  'email',
  'phone',
  'website',
  'financialYearStartMonth',
  'registeredAddress',
  'registeredAddress.line1',
  'registeredAddress.line2',
  'registeredAddress.city',
  'registeredAddress.state',
  'registeredAddress.pincode',
  'registeredAddress.country',
  'corporateAddress',
  'corporateAddress.line1',
  'corporateAddress.line2',
  'corporateAddress.city',
  'corporateAddress.state',
  'corporateAddress.pincode',
  'corporateAddress.country',
  'addressChangeReason',
]);

const statutoryFields = new Set<FieldPath<CompanyStatutoryFormValues>>([
  'legalName',
  'cin',
  'pan',
  'tan',
  'gstin',
]);

const capitalFields = new Set<FieldPath<CompanyCapitalFormValues>>([
  'capitalType',
  'newAmount',
  'effectiveFrom',
  'changeReason',
  'reference',
]);

function normaliseServerField(field: string): string {
  return field.replace(/^body\./, '').replace(/\[(\w+)\]/g, '.$1');
}

export function resolveCompanyProfileField(
  field: string,
): FieldPath<CompanyProfileFormValues> | null {
  const normalised = normaliseServerField(field);
  return profileFields.has(normalised as FieldPath<CompanyProfileFormValues>)
    ? (normalised as FieldPath<CompanyProfileFormValues>)
    : null;
}

export function resolveCompanyStatutoryField(
  field: string,
): FieldPath<CompanyStatutoryFormValues> | null {
  const normalised = normaliseServerField(field);
  return statutoryFields.has(normalised as FieldPath<CompanyStatutoryFormValues>)
    ? (normalised as FieldPath<CompanyStatutoryFormValues>)
    : null;
}

export function resolveCompanyCapitalField(
  field: string,
): FieldPath<CompanyCapitalFormValues> | null {
  const normalised = normaliseServerField(field);
  return capitalFields.has(normalised as FieldPath<CompanyCapitalFormValues>)
    ? (normalised as FieldPath<CompanyCapitalFormValues>)
    : null;
}

export function validateCompanyLogo(file: File): string | null {
  if (file.size > COMPANY_LOGO_MAX_BYTES) {
    return 'Logo must be 2 MB or smaller';
  }

  const mime = file.type.toLowerCase();
  if (!(COMPANY_LOGO_MIME_TYPES as readonly string[]).includes(mime)) {
    return 'Use a PNG, JPG, JPEG, WebP, or GIF image';
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) {
    return 'Logo filename must use .png, .jpg, .jpeg, .webp, or .gif';
  }

  return null;
}
