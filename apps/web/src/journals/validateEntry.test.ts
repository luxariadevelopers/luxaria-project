import { describe, expect, it } from 'vitest';
import type { PublicAccount } from '@/chart-of-accounts/types';
import { AccountCategory, AccountStatus, AccountType } from '@/chart-of-accounts/types';
import { validateJournalEntryDraft } from './validateEntry';

function account(
  partial: Partial<PublicAccount> & Pick<PublicAccount, 'id' | 'accountCode'>,
): PublicAccount {
  return {
    accountName: partial.accountName ?? partial.accountCode,
    accountType: AccountType.Asset,
    accountCategory: AccountCategory.Bank,
    parentAccountId: null,
    level: 1,
    isControlAccount: false,
    allowManualPosting: true,
    requiresProject: false,
    requiresParty: false,
    status: AccountStatus.Active,
    postingCount: 0,
    isSystem: false,
    ...partial,
  };
}

describe('validateJournalEntryDraft — balance', () => {
  const cash = account({ id: 'a1', accountCode: '1110' });
  const bank = account({ id: 'a2', accountCode: '1120' });
  const accountById = new Map([
    [cash.id, cash],
    [bank.id, bank],
  ]);

  it('accepts a balanced two-line journal', () => {
    const result = validateJournalEntryDraft({
      lines: [
        { accountId: 'a1', debit: 1000, credit: 0 },
        { accountId: 'a2', debit: 0, credit: 1000 },
      ],
      accountById,
    });
    expect(result.ok).toBe(true);
    expect(result.balanced).toBe(true);
    expect(result.totalDebit).toBe(1000);
    expect(result.totalCredit).toBe(1000);
  });

  it('rejects out-of-balance totals', () => {
    const result = validateJournalEntryDraft({
      lines: [
        { accountId: 'a1', debit: 1000, credit: 0 },
        { accountId: 'a2', debit: 0, credit: 900 },
      ],
      accountById,
    });
    expect(result.ok).toBe(false);
    expect(result.balanced).toBe(false);
    expect(result.issues.some((i) => i.message.includes('equal'))).toBe(true);
  });

  it('rejects a line with both debit and credit', () => {
    const result = validateJournalEntryDraft({
      lines: [
        { accountId: 'a1', debit: 500, credit: 500 },
        { accountId: 'a2', debit: 0, credit: 0 },
      ],
      accountById,
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.message.includes('both debit and credit')),
    ).toBe(true);
  });
});

describe('validateJournalEntryDraft — dimensions', () => {
  it('requires project when account.requiresProject and header has none', () => {
    const wip = account({
      id: 'wip',
      accountCode: '1400',
      requiresProject: true,
      accountType: AccountType.Asset,
      accountCategory: AccountCategory.WorkInProgress,
    });
    const bank = account({ id: 'bank', accountCode: '1120' });
    const result = validateJournalEntryDraft({
      lines: [
        { accountId: 'wip', debit: 100, credit: 0 },
        { accountId: 'bank', debit: 0, credit: 100 },
      ],
      headerProjectId: null,
      accountById: new Map([
        [wip.id, wip],
        [bank.id, bank],
      ]),
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.message.includes('requires a project')),
    ).toBe(true);
  });

  it('accepts header project for requiresProject accounts', () => {
    const wip = account({
      id: 'wip',
      accountCode: '1400',
      requiresProject: true,
    });
    const bank = account({ id: 'bank', accountCode: '1120' });
    const result = validateJournalEntryDraft({
      lines: [
        { accountId: 'wip', debit: 100, credit: 0 },
        { accountId: 'bank', debit: 0, credit: 100 },
      ],
      headerProjectId: '507f1f77bcf86cd799439011',
      accountById: new Map([
        [wip.id, wip],
        [bank.id, bank],
      ]),
    });
    expect(result.ok).toBe(true);
  });

  it('requires party id and type when account.requiresParty', () => {
    const payable = account({
      id: 'pay',
      accountCode: '2100',
      requiresParty: true,
      accountType: AccountType.Liability,
      accountCategory: AccountCategory.VendorPayable,
    });
    const bank = account({ id: 'bank', accountCode: '1120' });
    const map = new Map([
      [payable.id, payable],
      [bank.id, bank],
    ]);

    const missing = validateJournalEntryDraft({
      lines: [
        { accountId: 'pay', debit: 0, credit: 50 },
        { accountId: 'bank', debit: 50, credit: 0 },
      ],
      accountById: map,
    });
    expect(missing.ok).toBe(false);
    expect(
      missing.issues.some((i) => i.message.includes('requires a party')),
    ).toBe(true);

    const partyWithoutType = validateJournalEntryDraft({
      lines: [
        {
          accountId: 'pay',
          debit: 0,
          credit: 50,
          partyId: '507f1f77bcf86cd799439011',
        },
        { accountId: 'bank', debit: 50, credit: 0 },
      ],
      accountById: map,
    });
    expect(partyWithoutType.ok).toBe(false);
    expect(
      partyWithoutType.issues.some((i) =>
        i.message.includes('party type is required'),
      ),
    ).toBe(true);

    const ok = validateJournalEntryDraft({
      lines: [
        {
          accountId: 'pay',
          debit: 0,
          credit: 50,
          partyId: '507f1f77bcf86cd799439011',
          partyType: 'vendor',
        },
        { accountId: 'bank', debit: 50, credit: 0 },
      ],
      accountById: map,
    });
    expect(ok.ok).toBe(true);
  });

  it('blocks accounts without allowManualPosting', () => {
    const control = account({
      id: 'ctrl',
      accountCode: '1000',
      allowManualPosting: false,
      isControlAccount: true,
      accountCategory: AccountCategory.Control,
    });
    const bank = account({ id: 'bank', accountCode: '1120' });
    const result = validateJournalEntryDraft({
      lines: [
        { accountId: 'ctrl', debit: 10, credit: 0 },
        { accountId: 'bank', debit: 0, credit: 10 },
      ],
      accountById: new Map([
        [control.id, control],
        [bank.id, bank],
      ]),
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.message.includes('manual posting')),
    ).toBe(true);
  });
});
