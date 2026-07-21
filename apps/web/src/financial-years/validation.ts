import { z } from 'zod';
import type { CreateFinancialYearInput } from './types';

export function isCalendarDate(value: string): boolean {
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

const requiredCalendarDate = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine(isCalendarDate, `Enter a valid ${label.toLowerCase()}`);

export const financialYearFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Financial year name is required'),
    startDate: requiredCalendarDate('Start date'),
    endDate: requiredCalendarDate('End date'),
    setAsCurrent: z.boolean(),
  })
  .superRefine((values, context) => {
    if (
      isCalendarDate(values.startDate) &&
      isCalendarDate(values.endDate) &&
      values.endDate < values.startDate
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be on or after the start date',
      });
    }
  });

export type FinancialYearFormValues = z.infer<
  typeof financialYearFormSchema
>;

export const financialYearFormDefaults: FinancialYearFormValues = {
  name: '',
  startDate: '',
  endDate: '',
  setAsCurrent: false,
};

export function toCreateFinancialYearInput(
  values: FinancialYearFormValues,
  companyId?: string | null,
): CreateFinancialYearInput {
  return {
    name: values.name.trim(),
    startDate: values.startDate,
    endDate: values.endDate,
    ...(companyId ? { companyId } : {}),
    setAsCurrent: values.setAsCurrent,
  };
}

export const unlockRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Unlock reason must be at least 10 characters'),
});

export type UnlockRequestFormValues = z.infer<typeof unlockRequestSchema>;

export const unlockRejectionSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, 'Rejection reason must be at least 5 characters'),
});

export type UnlockRejectionFormValues = z.infer<
  typeof unlockRejectionSchema
>;

export const transactionDateSchema = z.object({
  transactionDate: requiredCalendarDate('Transaction date'),
  forPosting: z.boolean(),
});

export type TransactionDateFormValues = z.infer<
  typeof transactionDateSchema
>;
