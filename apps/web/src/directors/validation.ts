import { z } from 'zod';
import { DirectorStatus } from './types';

/** Backend `DIN_REGEX` — `apps/backend/.../shareholding.validation.ts` */
export const DIN_REGEX = /^[0-9]{8}$/;

/** Backend `PAN_REGEX` — `apps/backend/.../company.validation.ts` */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const optionalBlank = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v.trim() === '') return null;
    return v.trim();
  });

const dinField = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v.trim() === '') return null;
    return v.trim().toUpperCase();
  })
  .refine((v) => v === undefined || v === null || DIN_REGEX.test(v), {
    message: 'DIN must be an 8-digit number',
  });

const panField = z
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

export const directorFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  din: dinField,
  pan: panField,
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
  phone: optionalBlank,
  address: optionalBlank,
  appointmentDate: optionalBlank,
  status: z.enum([
    DirectorStatus.Active,
    DirectorStatus.Inactive,
    DirectorStatus.Resigned,
  ]),
});

export type DirectorFormValues = z.infer<typeof directorFormSchema>;

export function isValidDin(value: string | null | undefined): boolean {
  if (value == null || value.trim() === '') return true;
  return DIN_REGEX.test(value.trim().toUpperCase());
}

export function isValidPan(value: string | null | undefined): boolean {
  if (value == null || value.trim() === '') return true;
  return PAN_REGEX.test(value.trim().toUpperCase());
}
