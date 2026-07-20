import { describe, expect, it } from 'vitest';
import { AccountCategory, AccountType } from './types';
import {
  ACCOUNT_CATEGORY_ENUM_VALUES,
  accountCreateSchema,
  defaultAccountFormValues,
} from './validation';
import {
  shapeAccountCreatePayload,
  shapeAccountUpdatePayload,
} from './shapeAccountPayload';
import {
  defaultAllowManualPosting,
  describePostingRules,
} from './postingDefaults';

describe('account create validation', () => {
  it('rejects invalid parent/type combinations', () => {
    const result = accountCreateSchema.safeParse(
      defaultAccountFormValues({
        accountCode: '5100',
        accountName: 'Office expense',
        accountType: AccountType.Expense,
        accountCategory: AccountCategory.IndirectExpense,
        parentAccountId: 'assets-root',
        parentAccountType: AccountType.Asset,
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes('parentAccountId')),
      ).toBe(true);
    }
  });

  it('accepts matching parent type', () => {
    const result = accountCreateSchema.safeParse(
      defaultAccountFormValues({
        accountCode: '1110',
        accountName: 'Petty cash',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.PettyCash,
        parentAccountId: 'cash',
        parentAccountType: AccountType.Asset,
      }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects invalid account codes', () => {
    const result = accountCreateSchema.safeParse(
      defaultAccountFormValues({
        accountCode: 'bad code!',
        accountName: 'Bad',
        accountCategory: AccountCategory.Control,
      }),
    );
    expect(result.success).toBe(false);
  });

  it('accepts every Nest account category with each account type', () => {
    const types = Object.values(AccountType);
    let n = 0;
    for (const accountType of types) {
      for (const accountCategory of ACCOUNT_CATEGORY_ENUM_VALUES) {
        n += 1;
        const result = accountCreateSchema.safeParse(
          defaultAccountFormValues({
            accountCode: `A${n}`,
            accountName: `${accountType} / ${accountCategory}`,
            accountType,
            accountCategory,
            isControlAccount: accountCategory === AccountCategory.Control,
            allowManualPosting: accountCategory !== AccountCategory.Control,
          }),
        );
        expect(result.success).toBe(true);
      }
    }
    expect(n).toBe(types.length * ACCOUNT_CATEGORY_ENUM_VALUES.length);
  });
});

describe('posting defaults & payload shaping', () => {
  it('defaults allowManualPosting off for control accounts', () => {
    expect(defaultAllowManualPosting(true)).toBe(false);
    expect(defaultAllowManualPosting(false)).toBe(true);
  });

  it('describePostingRules covers dimension flags', () => {
    const notes = describePostingRules({
      isControlAccount: true,
      allowManualPosting: false,
      requiresProject: true,
      requiresParty: true,
    });
    expect(notes.some((n) => n.includes('Manual journal'))).toBe(true);
    expect(notes.some((n) => n.includes('project'))).toBe(true);
    expect(notes.some((n) => n.includes('party'))).toBe(true);
  });

  it('shapeAccountCreatePayload uppercases code and drops UI-only fields', () => {
    const payload = shapeAccountCreatePayload(
      defaultAccountFormValues({
        accountCode: 'bank-1',
        accountName: 'HDFC',
        accountCategory: AccountCategory.Bank,
        parentAccountId: '',
        parentAccountType: AccountType.Asset,
        requiresProject: true,
        requiresParty: false,
      }),
    );
    expect(payload.accountCode).toBe('BANK-1');
    expect(payload.parentAccountId).toBeNull();
    expect(payload.requiresProject).toBe(true);
    expect(payload).not.toHaveProperty('parentAccountType');
    expect(payload).not.toHaveProperty('typeLocked');
  });

  it('shapeAccountUpdatePayload never sends accountCode', () => {
    const payload = shapeAccountUpdatePayload(
      defaultAccountFormValues({
        accountCode: 'LOCKED',
        accountName: 'Updated',
        isControlAccount: true,
        allowManualPosting: false,
      }),
    );
    expect(payload).not.toHaveProperty('accountCode');
    expect(payload.accountName).toBe('Updated');
    expect(payload.isControlAccount).toBe(true);
    expect(payload.allowManualPosting).toBe(false);
  });
});
