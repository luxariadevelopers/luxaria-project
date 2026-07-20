import { defaultAllowManualPosting } from './postingDefaults';
import type { CreateAccountInput, UpdateAccountInput } from './types';
import type { AccountFormValues } from './validation';

/** Map form → Nest `CreateAccountDto` (drops UI-only fields). */
export function shapeAccountCreatePayload(
  values: AccountFormValues,
): CreateAccountInput {
  const isControl = values.isControlAccount;
  return {
    accountCode: values.accountCode.trim().toUpperCase(),
    accountName: values.accountName.trim(),
    accountType: values.accountType,
    accountCategory: values.accountCategory,
    parentAccountId: values.parentAccountId?.trim()
      ? values.parentAccountId.trim()
      : null,
    isControlAccount: isControl,
    allowManualPosting:
      values.allowManualPosting ?? defaultAllowManualPosting(isControl),
    requiresProject: values.requiresProject,
    requiresParty: values.requiresParty,
  };
}

/** Map form → Nest `UpdateAccountDto` (accountCode immutable — never sent). */
export function shapeAccountUpdatePayload(
  values: AccountFormValues,
): UpdateAccountInput {
  return {
    accountName: values.accountName.trim(),
    /** System accounts reject type changes — omit when locked. */
    accountType: values.typeLocked ? undefined : values.accountType,
    accountCategory: values.accountCategory,
    parentAccountId: values.parentAccountId?.trim()
      ? values.parentAccountId.trim()
      : null,
    isControlAccount: values.isControlAccount,
    allowManualPosting: values.allowManualPosting,
    requiresProject: values.requiresProject,
    requiresParty: values.requiresParty,
  };
}
