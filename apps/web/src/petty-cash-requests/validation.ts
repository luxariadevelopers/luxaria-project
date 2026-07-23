import { z } from 'zod';
import { isoDateOnlySchema, roundMoney } from '@/validation';
import { assertRequestedTotalConsistent } from './itemTotals';
import {
  PettyCashExpenseCategory,
  PettyCashRequirementStatus,
  type CreatePettyCashRequirementInput,
  type PublicPettyCashRequirement,
  type UpdatePettyCashRequirementInput,
} from './types';

/** Nest ConflictException message for account + week uniqueness. */
export const DUPLICATE_ACCOUNT_WEEK_MESSAGE =
  'A petty-cash requirement already exists for this account and week';

const OPEN_STATUSES_EXCLUDED = new Set<string>([
  PettyCashRequirementStatus.Cancelled,
  PettyCashRequirementStatus.Rejected,
]);

function toDateKey(value: string | Date): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

/**
 * Client preview of Nest `assertNoDuplicateWeek` — one open request per
 * petty-cash account + week start. Cancelled/rejected do not block.
 * Server remains authoritative (409).
 */
export function hasDuplicateAccountWeek(
  existing: readonly Pick<
    PublicPettyCashRequirement,
    'id' | 'pettyCashAccountId' | 'weekStartDate' | 'status'
  >[],
  args: {
    pettyCashAccountId: string;
    weekStartDate: string;
    excludeId?: string;
  },
): boolean {
  const weekKey = toDateKey(args.weekStartDate);
  return existing.some((row) => {
    if (args.excludeId && row.id === args.excludeId) return false;
    if (row.pettyCashAccountId !== args.pettyCashAccountId) return false;
    if (OPEN_STATUSES_EXCLUDED.has(row.status)) return false;
    return toDateKey(row.weekStartDate) === weekKey;
  });
}

export function assertNoDuplicateAccountWeek(
  existing: readonly Pick<
    PublicPettyCashRequirement,
    'id' | 'pettyCashAccountId' | 'weekStartDate' | 'status'
  >[],
  args: {
    pettyCashAccountId: string;
    weekStartDate: string;
    excludeId?: string;
  },
): { ok: true } | { ok: false; message: string } {
  if (hasDuplicateAccountWeek(existing, args)) {
    return { ok: false, message: DUPLICATE_ACCOUNT_WEEK_MESSAGE };
  }
  return { ok: true };
}

export function isDuplicateAccountWeekMessage(message: string): boolean {
  return message
    .toLowerCase()
    .includes('already exists for this account and week');
}

/** Prior funded-not-closed float snapshotted on the requirement. */
export function hasPreviousUnsettledCash(
  row: Pick<PublicPettyCashRequirement, 'previousUnsettledAmount'>,
): boolean {
  return (
    Number.isFinite(row.previousUnsettledAmount) &&
    row.previousUnsettledAmount > 0
  );
}

const CATEGORY_VALUES = Object.values(PettyCashExpenseCategory) as [
  string,
  ...string[],
];

/**
 * Nest `assertWeek`: end ≥ start and span ≤ 7 days
 * (end-of-day − start-of-day inclusive week).
 */
export function assertWeekDates(
  weekStartDate: string,
  weekEndDate: string,
): { ok: true } | { ok: false; message: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartDate)) {
    return { ok: false, message: 'Week start must be YYYY-MM-DD.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekEndDate)) {
    return { ok: false, message: 'Week end must be YYYY-MM-DD.' };
  }
  const start = new Date(`${weekStartDate}T00:00:00.000Z`);
  const end = new Date(`${weekEndDate}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: 'Invalid weekStartDate or weekEndDate.' };
  }
  if (end < start) {
    return {
      ok: false,
      message: 'weekEndDate must be on or after weekStartDate.',
    };
  }
  const spanDays =
    (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
  if (spanDays > 7.01) {
    return { ok: false, message: 'Week range cannot exceed 7 days.' };
  }
  return { ok: true };
}

/** Default Mon–Sun week containing `asOf` (UTC calendar days). */
export function defaultWeekRange(asOf = new Date()): {
  weekStartDate: string;
  weekEndDate: string;
} {
  const d = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()),
  );
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    weekStartDate: monday.toISOString().slice(0, 10),
    weekEndDate: sunday.toISOString().slice(0, 10),
  };
}

export const requirementItemFormSchema = z.object({
  expenseCategory: z.enum(CATEGORY_VALUES, {
    required_error: 'Category is required',
  }),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(500, 'Description is too long'),
  /** Positive amounts — Nest DTO allows 0 per line but total must be > 0. */
  estimatedAmount: z.coerce
    .number()
    .min(0.01, 'Amount must be greater than zero'),
});

export const pettyCashRequestFormSchema = z
  .object({
    projectId: z.string().trim().min(1, 'Project is required'),
    pettyCashAccountId: z
      .string()
      .trim()
      .min(1, 'Petty-cash account is required'),
    weekStartDate: isoDateOnlySchema,
    weekEndDate: isoDateOnlySchema,
    justification: z
      .string()
      .trim()
      .min(1, 'Justification is required')
      .max(2000, 'Justification is too long'),
    requirementItems: z
      .array(requirementItemFormSchema)
      .min(1, 'At least one requirement item is required'),
  })
  .superRefine((values, ctx) => {
    const week = assertWeekDates(values.weekStartDate, values.weekEndDate);
    if (!week.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: week.message,
        path: ['weekEndDate'],
      });
    }
    const totals = assertRequestedTotalConsistent(values.requirementItems);
    if (!totals.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: totals.message,
        path: ['requirementItems'],
      });
    }
    const seen = new Map<string, number>();
    values.requirementItems.forEach((item, index) => {
      const cat = item.expenseCategory;
      const firstIndex = seen.get(cat);
      if (firstIndex != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Each category can only be used once — pick a different category for this item.',
          path: ['requirementItems', index, 'expenseCategory'],
        });
      } else {
        seen.set(cat, index);
      }
    });
  });

export type PettyCashRequestFormValues = z.infer<
  typeof pettyCashRequestFormSchema
>;
export type RequirementItemFormValues = z.infer<
  typeof requirementItemFormSchema
>;

export function emptyRequirementItem(): RequirementItemFormValues {
  return {
    expenseCategory: PettyCashExpenseCategory.SiteMisc,
    description: '',
    estimatedAmount: 0,
  };
}

export function defaultPettyCashRequestValues(
  partial?: Partial<PettyCashRequestFormValues>,
): PettyCashRequestFormValues {
  const week = defaultWeekRange();
  return {
    projectId: '',
    pettyCashAccountId: '',
    weekStartDate: week.weekStartDate,
    weekEndDate: week.weekEndDate,
    justification: '',
    requirementItems: [emptyRequirementItem()],
    ...partial,
  };
}

export function shapeCreatePayload(
  values: PettyCashRequestFormValues,
): CreatePettyCashRequirementInput {
  return {
    projectId: values.projectId,
    pettyCashAccountId: values.pettyCashAccountId,
    weekStartDate: values.weekStartDate,
    weekEndDate: values.weekEndDate,
    justification: values.justification.trim(),
    requirementItems: values.requirementItems.map((item) => ({
      expenseCategory:
        item.expenseCategory as CreatePettyCashRequirementInput['requirementItems'][number]['expenseCategory'],
      description: item.description.trim(),
      estimatedAmount: roundMoney(item.estimatedAmount),
    })),
  };
}

export function shapeUpdatePayload(
  values: Pick<
    PettyCashRequestFormValues,
    'weekStartDate' | 'weekEndDate' | 'justification' | 'requirementItems'
  >,
): UpdatePettyCashRequirementInput {
  const created = shapeCreatePayload({
    projectId: '_',
    pettyCashAccountId: '_',
    ...values,
  });
  return {
    weekStartDate: created.weekStartDate,
    weekEndDate: created.weekEndDate,
    justification: created.justification,
    requirementItems: created.requirementItems,
  };
}
