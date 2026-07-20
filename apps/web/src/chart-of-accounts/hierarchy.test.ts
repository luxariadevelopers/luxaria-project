import { describe, expect, it } from 'vitest';
import {
  buildAccountBreadcrumbs,
  collectDescendantIds,
  findTreeNode,
  flattenAccountTree,
} from './hierarchy';
import type { AccountTreeNode } from './types';

function node(
  partial: Partial<AccountTreeNode> &
    Pick<AccountTreeNode, 'id' | 'accountCode' | 'accountName' | 'accountType'>,
): AccountTreeNode {
  return {
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
    children: [],
    ...partial,
  };
}

const tree: AccountTreeNode[] = [
  node({
    id: 'assets',
    accountCode: '1000',
    accountName: 'Assets',
    accountType: 'asset',
    level: 1,
    children: [
      node({
        id: 'cash',
        accountCode: '1100',
        accountName: 'Cash',
        accountType: 'asset',
        parentAccountId: 'assets',
        level: 2,
        accountCategory: 'cash',
        children: [
          node({
            id: 'petty',
            accountCode: '1110',
            accountName: 'Petty cash',
            accountType: 'asset',
            parentAccountId: 'cash',
            level: 3,
            accountCategory: 'petty_cash',
          }),
        ],
      }),
    ],
  }),
  node({
    id: 'liab',
    accountCode: '2000',
    accountName: 'Liabilities',
    accountType: 'liability',
    level: 1,
  }),
];

describe('account hierarchy helpers', () => {
  it('flattens the tree in depth-first order', () => {
    expect(flattenAccountTree(tree).map((a) => a.id)).toEqual([
      'assets',
      'cash',
      'petty',
      'liab',
    ]);
  });

  it('builds breadcrumbs from root to leaf', () => {
    const crumbs = buildAccountBreadcrumbs(tree, 'petty');
    expect(crumbs.map((c) => c.accountCode)).toEqual([
      '1000',
      '1100',
      '1110',
    ]);
  });

  it('collects descendants for cycle-safe parent pickers', () => {
    const ids = collectDescendantIds(tree, 'assets');
    expect([...ids].sort()).toEqual(['cash', 'petty']);
    expect(collectDescendantIds(tree, 'petty').size).toBe(0);
  });

  it('finds nested nodes', () => {
    expect(findTreeNode(tree, 'cash')?.accountName).toBe('Cash');
    expect(findTreeNode(tree, 'missing')).toBeNull();
  });
});
