import { z } from 'zod';

/** Nest categoryCode regex */
export const CATEGORY_CODE_REGEX = /^[A-Za-z0-9_-]+$/;

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const objectId = z
  .string()
  .min(1, 'Default ledger account is required')
  .regex(OBJECT_ID_RE, 'Must be a valid ObjectId');

/**
 * Form string for approval threshold — empty clears; otherwise ≥ 0.
 * Convert via `toApprovalLimit` before API calls.
 */
const approvalLimitField = z
  .string()
  .optional()
  .superRefine((value, ctx) => {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) return;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Approval limit must be a number',
      });
      return;
    }
    if (n < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Approval limit must be ≥ 0',
      });
    }
  });

const evidenceFields = {
  requiresBill: z.boolean(),
  requiresSignature: z.boolean(),
  requiresPhoto: z.boolean(),
  approvalLimit: approvalLimitField,
};

/**
 * Create form — mirrors Nest `CreateExpenseCategoryDto` plus UI rule that
 * a default expense ledger mapping is required for finance control.
 */
export const expenseCategoryCreateSchema = z.object({
  categoryCode: z
    .string()
    .trim()
    .min(1, 'Category code is required')
    .max(32)
    .regex(CATEGORY_CODE_REGEX, 'Alphanumeric, underscore or hyphen only'),
  name: z.string().trim().min(1, 'Name is required').max(200),
  /** Empty string = root. */
  parentCategoryId: z.string().optional().nullable(),
  defaultLedgerAccountId: objectId,
  ...evidenceFields,
});

export type ExpenseCategoryCreateFormValues = z.infer<
  typeof expenseCategoryCreateSchema
>;

/** Edit uses the same shape; code is display-only and not sent on PATCH. */
export const expenseCategoryUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  parentCategoryId: z.string().optional().nullable(),
  defaultLedgerAccountId: objectId,
  ...evidenceFields,
});

export type ExpenseCategoryUpdateFormValues = z.infer<
  typeof expenseCategoryUpdateSchema
>;

/** Dedicated evidence-rules form (`PATCH …/evidence-rules`). */
export const evidenceRulesSchema = z.object(evidenceFields);

export type EvidenceRulesFormValues = z.infer<typeof evidenceRulesSchema>;

export function defaultCreateFormValues(
  partial?: Partial<ExpenseCategoryCreateFormValues>,
): ExpenseCategoryCreateFormValues {
  return {
    categoryCode: '',
    name: '',
    parentCategoryId: '',
    defaultLedgerAccountId: '',
    requiresBill: false,
    requiresSignature: false,
    requiresPhoto: false,
    approvalLimit: '',
    ...partial,
  };
}

export function categoryToUpdateFormValues(category: {
  name: string;
  parentCategoryId: string | null;
  defaultLedgerAccountId: string | null;
  requiresBill: boolean;
  requiresSignature: boolean;
  requiresPhoto: boolean;
  approvalLimit: number | null;
}): ExpenseCategoryUpdateFormValues {
  return {
    name: category.name,
    parentCategoryId: category.parentCategoryId ?? '',
    defaultLedgerAccountId: category.defaultLedgerAccountId ?? '',
    requiresBill: category.requiresBill,
    requiresSignature: category.requiresSignature,
    requiresPhoto: category.requiresPhoto,
    approvalLimit:
      category.approvalLimit === null || category.approvalLimit === undefined
        ? ''
        : String(category.approvalLimit),
  };
}

export function categoryToEvidenceFormValues(category: {
  requiresBill: boolean;
  requiresSignature: boolean;
  requiresPhoto: boolean;
  approvalLimit: number | null;
}): EvidenceRulesFormValues {
  return {
    requiresBill: category.requiresBill,
    requiresSignature: category.requiresSignature,
    requiresPhoto: category.requiresPhoto,
    approvalLimit:
      category.approvalLimit === null || category.approvalLimit === undefined
        ? ''
        : String(category.approvalLimit),
  };
}

/** Normalise empty parent to null for API payloads. */
export function toParentCategoryId(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Normalise approval limit form string for API (null clears). */
export function toApprovalLimit(
  value: string | number | null | undefined,
): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
