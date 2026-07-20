import { z } from 'zod';
import {
  bankAccountNumberRequiredSchema,
  ifscRequiredSchema,
} from '@/validation';
import { BankAccountStatus, BankAccountType } from './types';

const mongoIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const bankAccountCreateSchema = z.object({
  bankName: z.string().trim().min(1, 'Bank name is required').max(120),
  branch: z.string().trim().max(120).optional().or(z.literal('')),
  accountHolderName: z
    .string()
    .trim()
    .min(1, 'Account holder name is required')
    .max(200),
  accountNumber: bankAccountNumberRequiredSchema,
  ifsc: ifscRequiredSchema,
  accountType: z.enum([
    BankAccountType.Current,
    BankAccountType.Savings,
    BankAccountType.Overdraft,
    BankAccountType.CashCredit,
    BankAccountType.Escrow,
    BankAccountType.Other,
  ]),
  projectId: z.union([mongoIdSchema, z.literal('')]).optional(),
  ledgerAccountId: mongoIdSchema,
  openingBalance: z.coerce.number().finite('Opening balance must be a number'),
  isDefault: z.boolean(),
});

export type BankAccountCreateFormValues = z.infer<
  typeof bankAccountCreateSchema
>;

export const bankAccountUpdateSchema = z.object({
  bankName: z.string().trim().min(1, 'Bank name is required').max(120),
  branch: z.string().trim().max(120).optional().or(z.literal('')),
  accountHolderName: z
    .string()
    .trim()
    .min(1, 'Account holder name is required')
    .max(200),
  /** Optional rotate — empty means leave unchanged. */
  accountNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .superRefine((value, ctx) => {
      if (!value) return;
      const parsed = bankAccountNumberRequiredSchema.safeParse(value);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: parsed.error.issues[0]?.message ?? 'Invalid account number',
        });
      }
    }),
  ifsc: ifscRequiredSchema,
  accountType: z.enum([
    BankAccountType.Current,
    BankAccountType.Savings,
    BankAccountType.Overdraft,
    BankAccountType.CashCredit,
    BankAccountType.Escrow,
    BankAccountType.Other,
  ]),
  projectId: z.union([mongoIdSchema, z.literal('')]).optional(),
  ledgerAccountId: mongoIdSchema,
  openingBalance: z.coerce.number().finite('Opening balance must be a number'),
  isDefault: z.boolean(),
});

export type BankAccountUpdateFormValues = z.infer<
  typeof bankAccountUpdateSchema
>;

export type BankAccountFilterState = {
  status: string;
  projectId: string;
  /** When true, Nest `companyOnly=true` (ignores projectId). */
  companyOnly: boolean;
  search: string;
};

export function defaultBankAccountFilters(
  projectId = '',
): BankAccountFilterState {
  return {
    status: '',
    projectId,
    companyOnly: false,
    search: '',
  };
}

export function validateBankAccountFilters(input: {
  filters: BankAccountFilterState;
  page: number;
  limit: number;
}): {
  ready: boolean;
  api: {
    page: number;
    limit: number;
    status?: (typeof BankAccountStatus)[keyof typeof BankAccountStatus];
    projectId?: string;
    companyOnly?: boolean;
    search?: string;
  };
  fieldErrors: Partial<Record<keyof BankAccountFilterState, string>>;
} {
  const fieldErrors: Partial<Record<keyof BankAccountFilterState, string>> =
    {};
  const status = input.filters.status.trim();
  if (
    status &&
    !Object.values(BankAccountStatus).includes(
      status as (typeof BankAccountStatus)[keyof typeof BankAccountStatus],
    )
  ) {
    fieldErrors.status = 'Invalid status';
  }

  const page = Math.max(1, Math.floor(input.page) || 1);
  const limit = Math.min(100, Math.max(1, Math.floor(input.limit) || 20));

  const api: {
    page: number;
    limit: number;
    status?: (typeof BankAccountStatus)[keyof typeof BankAccountStatus];
    projectId?: string;
    companyOnly?: boolean;
    search?: string;
  } = { page, limit };

  if (status && !fieldErrors.status) {
    api.status = status as (typeof BankAccountStatus)[keyof typeof BankAccountStatus];
  }
  if (input.filters.companyOnly) {
    api.companyOnly = true;
  } else if (input.filters.projectId.trim()) {
    const pid = input.filters.projectId.trim();
    if (!/^[a-f\d]{24}$/i.test(pid)) {
      fieldErrors.projectId = 'Invalid project';
    } else {
      api.projectId = pid;
    }
  }
  const search = input.filters.search.trim();
  if (search) {
    api.search = search;
  }

  return {
    ready: Object.keys(fieldErrors).length === 0,
    api,
    fieldErrors,
  };
}
