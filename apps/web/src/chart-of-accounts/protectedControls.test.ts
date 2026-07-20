import { describe, expect, it } from 'vitest';
import {
  isValidParentType,
  resolveAccountControls,
} from './protectedControls';
import type { AccountTreeNode, PublicAccount } from './types';

function account(
  partial: Partial<PublicAccount> & Pick<PublicAccount, 'id'>,
): PublicAccount {
  return {
    accountCode: 'X',
    accountName: 'X',
    accountType: 'asset',
    accountCategory: 'control',
    parentAccountId: null,
    level: 1,
    isControlAccount: false,
    allowManualPosting: true,
    requiresProject: false,
    requiresParty: false,
    status: 'active',
    postingCount: 0,
    isSystem: false,
    ...partial,
  };
}

describe('protected account controls', () => {
  it('locks type and delete on system accounts', () => {
    const flags = resolveAccountControls(
      account({ id: '1', isSystem: true }),
    );
    expect(flags.isProtectedSystem).toBe(true);
    expect(flags.canEditType).toBe(false);
    expect(flags.canDelete).toBe(false);
    expect(flags.deleteBlockedReason).toMatch(/System-seeded/);
  });

  it('blocks delete when postings exist', () => {
    const flags = resolveAccountControls(
      account({ id: '1', postingCount: 3 }),
    );
    expect(flags.canDelete).toBe(false);
    expect(flags.deleteBlockedReason).toMatch(/postings/);
  });

  it('blocks delete when children exist', () => {
    const treeNode: AccountTreeNode = {
      ...account({ id: 'parent' }),
      children: [
        {
          ...account({ id: 'child', parentAccountId: 'parent' }),
          children: [],
        },
      ],
    };
    const flags = resolveAccountControls(treeNode, treeNode);
    expect(flags.canDelete).toBe(false);
    expect(flags.deleteBlockedReason).toMatch(/child/);
  });

  it('blocks deactivate when active children exist', () => {
    const treeNode: AccountTreeNode = {
      ...account({ id: 'parent' }),
      children: [
        {
          ...account({
            id: 'child',
            parentAccountId: 'parent',
            status: 'active',
          }),
          children: [],
        },
      ],
    };
    const flags = resolveAccountControls(treeNode, treeNode);
    expect(flags.canDeactivate).toBe(false);
    expect(flags.deactivateBlockedReason).toMatch(/child/);
  });

  it('allows deactivate when children are inactive', () => {
    const treeNode: AccountTreeNode = {
      ...account({ id: 'parent' }),
      children: [
        {
          ...account({
            id: 'child',
            parentAccountId: 'parent',
            status: 'inactive',
          }),
          children: [],
        },
      ],
    };
    const flags = resolveAccountControls(treeNode, treeNode);
    expect(flags.canDeactivate).toBe(true);
  });
});

describe('parent / type combinations', () => {
  it('requires child type to match parent type', () => {
    expect(
      isValidParentType('asset', { accountType: 'asset' }),
    ).toBe(true);
    expect(
      isValidParentType('expense', { accountType: 'asset' }),
    ).toBe(false);
    expect(isValidParentType('asset', null)).toBe(true);
  });
});
