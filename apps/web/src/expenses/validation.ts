import { z } from 'zod';
import { isoDateOnlySchema } from '@/validation';
import { SiteExpenseVoucherStatus } from './types';

const STATUS_VALUES = Object.values(SiteExpenseVoucherStatus) as [
  string,
  ...string[],
];

/**
 * List filters: project comes from header context; status is sent to Nest;
 * date range is client-only (list DTO has no dateFrom/dateTo).
 */
export const expenseListFiltersSchema = z
  .object({
    projectId: z.string().trim().optional(),
    status: z.union([z.literal(''), z.enum(STATUS_VALUES)]).optional(),
    dateFrom: z.union([z.literal(''), isoDateOnlySchema]).optional(),
    dateTo: z.union([z.literal(''), isoDateOnlySchema]).optional(),
  })
  .superRefine((values, ctx) => {
    const from = values.dateFrom?.trim() ?? '';
    const to = values.dateTo?.trim() ?? '';
    if (from && to && to < from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date to must be on or after date from.',
        path: ['dateTo'],
      });
    }
  });

export type ExpenseListFiltersValues = z.infer<typeof expenseListFiltersSchema>;

export function validateExpenseListFilters(
  values: ExpenseListFiltersValues,
): { ok: true } | { ok: false; message: string } {
  const parsed = expenseListFiltersSchema.safeParse(values);
  if (parsed.success) return { ok: true };
  const message =
    parsed.error.issues[0]?.message ?? 'Invalid expense list filters.';
  return { ok: false, message };
}

/** Nest: posted vouchers are immutable — no update/cancel after post. */
export function isExpensePosted(
  row: Pick<{ status: string }, 'status'>,
): boolean {
  return row.status === SiteExpenseVoucherStatus.Posted;
}

/** Nest `assertEditable` — only draft / returned may be updated. */
export function isExpenseEditable(
  row: Pick<{ status: string }, 'status'>,
): boolean {
  return (
    row.status === SiteExpenseVoucherStatus.Draft ||
    row.status === SiteExpenseVoucherStatus.Returned
  );
}

// --- Phase 053 action schemas ---

/**
 * Reject body — Nest `RejectSiteExpenseVoucherDto.reason` (required, max 1000).
 * UI labels this field "Comments".
 */
export const rejectExpenseSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Comments are required to reject')
    .max(1000),
});

export type RejectExpenseFormValues = z.infer<typeof rejectExpenseSchema>;

/** Return body — Nest `ReturnSiteExpenseVoucherDto.comment` (optional). */
export const returnExpenseSchema = z.object({
  comment: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type ReturnExpenseFormValues = z.infer<typeof returnExpenseSchema>;

/**
 * Cancel body — Nest `CancelSiteExpenseVoucherDto.cancellationReason`
 * (required). Prompt “reversal reason” maps here — Nest has no expense reverse.
 */
export const cancelExpenseSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(1, 'Cancellation reason is required')
    .max(1000),
});

export type CancelExpenseFormValues = z.infer<typeof cancelExpenseSchema>;
