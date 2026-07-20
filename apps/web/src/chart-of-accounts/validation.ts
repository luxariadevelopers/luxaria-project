import { z } from 'zod';
import { AccountCategory, AccountType } from './types';
import { isValidParentType } from './protectedControls';

/** Nest accountCode regex */
export const ACCOUNT_CODE_REGEX = /^[A-Za-z0-9_-]+$/;

const accountTypeEnum = z.enum([
  AccountType.Asset,
  AccountType.Liability,
  AccountType.Equity,
  AccountType.Income,
  AccountType.Expense,
]);

/** Every Nest `AccountCategory` value — used for combination tests. */
export const ACCOUNT_CATEGORY_ENUM_VALUES = [
  AccountCategory.Bank,
  AccountCategory.Cash,
  AccountCategory.PettyCash,
  AccountCategory.DirectorAccount,
  AccountCategory.InvestorAccount,
  AccountCategory.CustomerAdvance,
  AccountCategory.VendorPayable,
  AccountCategory.ContractorPayable,
  AccountCategory.LabourPayable,
  AccountCategory.MaterialPurchase,
  AccountCategory.WorkInProgress,
  AccountCategory.LandCost,
  AccountCategory.DirectExpense,
  AccountCategory.IndirectExpense,
  AccountCategory.InputGst,
  AccountCategory.OutputGst,
  AccountCategory.TdsPayable,
  AccountCategory.RetentionPayable,
  AccountCategory.Loan,
  AccountCategory.Interest,
  AccountCategory.Sales,
  AccountCategory.OtherIncome,
  AccountCategory.Control,
] as const;

const accountCategoryEnum = z.enum(ACCOUNT_CATEGORY_ENUM_VALUES);

const accountFormFields = {
  accountCode: z
    .string()
    .trim()
    .min(1, 'Account code is required')
    .max(32)
    .regex(ACCOUNT_CODE_REGEX, 'Alphanumeric, underscore or hyphen only'),
  accountName: z.string().trim().min(1, 'Account name is required').max(200),
  accountType: accountTypeEnum,
  accountCategory: accountCategoryEnum,
  /** Empty string = root. */
  parentAccountId: z.string().optional().nullable(),
  /** UI-only — used to validate parent type match. */
  parentAccountType: z.string().optional().nullable(),
  isControlAccount: z.boolean(),
  allowManualPosting: z.boolean(),
  requiresProject: z.boolean(),
  requiresParty: z.boolean(),
  /** When true, type field is locked (system account). */
  typeLocked: z.boolean(),
};

function refineParentType(
  values: {
    accountType: AccountType;
    parentAccountId?: string | null;
    parentAccountType?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  const parentId = values.parentAccountId?.trim();
  if (
    parentId &&
    values.parentAccountType &&
    !isValidParentType(values.accountType, {
      accountType: values.parentAccountType as AccountType,
    })
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Parent account type must match the child account type.',
      path: ['parentAccountId'],
    });
  }
}

export const accountCreateSchema = z
  .object(accountFormFields)
  .superRefine(refineParentType);

export type AccountFormValues = z.infer<typeof accountCreateSchema>;

/** Edit uses the same shape; code is display-only and not sent on PATCH. */
export const accountUpdateSchema = accountCreateSchema;

export type AccountCreateFormValues = AccountFormValues;
export type AccountUpdateFormValues = AccountFormValues;

export function defaultAccountFormValues(
  partial?: Partial<AccountFormValues>,
): AccountFormValues {
  return {
    accountCode: '',
    accountName: '',
    accountType: AccountType.Asset,
    accountCategory: AccountCategory.Bank,
    parentAccountId: '',
    parentAccountType: null,
    isControlAccount: false,
    allowManualPosting: true,
    requiresProject: false,
    requiresParty: false,
    typeLocked: false,
    ...partial,
  };
}

export function accountToFormValues(account: {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  parentAccountId: string | null;
  isControlAccount: boolean;
  allowManualPosting: boolean;
  requiresProject: boolean;
  requiresParty: boolean;
  isSystem: boolean;
  parentAccountType?: string | null;
}): AccountFormValues {
  return {
    accountCode: account.accountCode,
    accountName: account.accountName,
    accountType: account.accountType,
    accountCategory: account.accountCategory,
    parentAccountId: account.parentAccountId ?? '',
    parentAccountType: account.parentAccountType ?? null,
    isControlAccount: account.isControlAccount,
    allowManualPosting: account.allowManualPosting,
    requiresProject: account.requiresProject,
    requiresParty: account.requiresParty,
    typeLocked: account.isSystem,
  };
}
