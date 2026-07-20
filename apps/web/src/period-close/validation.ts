import { z } from 'zod';
import { AccountingPeriodType } from './types';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const objectId = z
  .string()
  .min(1, 'Required')
  .regex(OBJECT_ID_RE, 'Must be a valid ObjectId');

/** Mirrors Nest `CreateAccountingPeriodDto`. */
export const createAccountingPeriodSchema = z
  .object({
    periodType: z.enum([
      AccountingPeriodType.Monthly,
      AccountingPeriodType.FinancialYear,
    ]),
    financialYearId: objectId,
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((values, ctx) => {
    if (
      values.periodType === AccountingPeriodType.Monthly &&
      (values.month == null || Number.isNaN(values.month))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['month'],
        message: 'Month is required for monthly periods',
      });
    }
  });

export type CreateAccountingPeriodFormValues = z.infer<
  typeof createAccountingPeriodSchema
>;

/** Mirrors Nest `RequestPeriodReopenDto` — reason min 5. */
export const requestPeriodReopenSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(1000, 'Reason must be at most 1000 characters'),
});

export type RequestPeriodReopenFormValues = z.infer<
  typeof requestPeriodReopenSchema
>;

/** Mirrors Nest `ApprovePeriodReopenDto`. */
export const approvePeriodReopenSchema = z.object({
  approvalNote: z.string().trim().max(500).optional(),
});

export type ApprovePeriodReopenFormValues = z.infer<
  typeof approvePeriodReopenSchema
>;

/** Mirrors Nest `RejectPeriodReopenDto` — rejectionReason min 3. */
export const rejectPeriodReopenSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(3, 'Rejection reason must be at least 3 characters')
    .max(1000, 'Rejection reason must be at most 1000 characters'),
});

export type RejectPeriodReopenFormValues = z.infer<
  typeof rejectPeriodReopenSchema
>;
