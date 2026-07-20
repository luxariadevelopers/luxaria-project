import { describe, expect, it } from 'vitest';
import {
  buildCategoryBreadcrumbs,
  collectDescendantIds,
  filterCategoryTree,
  findTreeNode,
  flattenCategoryTree,
} from './hierarchy';
import type { ExpenseCategoryTreeNode } from './types';

function node(
  partial: Partial<ExpenseCategoryTreeNode> &
    Pick<ExpenseCategoryTreeNode, 'id' | 'categoryCode' | 'name'>,
): ExpenseCategoryTreeNode {
  return {
    parentCategoryId: null,
    level: 1,
    defaultLedgerAccountId: null,
    requiresBill: false,
    requiresSignature: false,
    requiresPhoto: false,
    approvalLimit: null,
    status: 'active',
    isSystem: false,
    children: [],
    ...partial,
  };
}

const tree: ExpenseCategoryTreeNode[] = [
  node({
    id: 'labour',
    categoryCode: 'LABOUR',
    name: 'Labour',
    level: 1,
    requiresSignature: true,
    children: [
      node({
        id: 'skilled',
        categoryCode: 'LABOUR_SKILLED',
        name: 'Skilled labour',
        parentCategoryId: 'labour',
        level: 2,
        requiresBill: true,
        requiresSignature: true,
        children: [
          node({
            id: 'mason',
            categoryCode: 'LABOUR_MASON',
            name: 'Mason',
            parentCategoryId: 'skilled',
            level: 3,
            requiresPhoto: true,
            approvalLimit: 5000,
          }),
        ],
      }),
    ],
  }),
  node({
    id: 'material',
    categoryCode: 'MATERIAL',
    name: 'Material',
    level: 1,
    requiresBill: true,
    status: 'inactive',
  }),
];

describe('expense category hierarchy helpers', () => {
  it('flattens the tree in depth-first order', () => {
    expect(flattenCategoryTree(tree).map((c) => c.id)).toEqual([
      'labour',
      'skilled',
      'mason',
      'material',
    ]);
  });

  it('builds breadcrumbs from root to leaf', () => {
    const crumbs = buildCategoryBreadcrumbs(tree, 'mason');
    expect(crumbs.map((c) => c.categoryCode)).toEqual([
      'LABOUR',
      'LABOUR_SKILLED',
      'LABOUR_MASON',
    ]);
  });

  it('collects descendant ids excluding self', () => {
    expect([...collectDescendantIds(tree, 'labour')].sort()).toEqual([
      'mason',
      'skilled',
    ]);
    expect(collectDescendantIds(tree, 'mason').size).toBe(0);
  });

  it('finds a nested tree node', () => {
    expect(findTreeNode(tree, 'skilled')?.categoryCode).toBe('LABOUR_SKILLED');
    expect(findTreeNode(tree, 'missing')).toBeNull();
  });

  it('filters by search while keeping ancestors', () => {
    const filtered = filterCategoryTree(tree, { search: 'mason' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.categoryCode).toBe('LABOUR');
    expect(filtered[0]?.children[0]?.children[0]?.categoryCode).toBe(
      'LABOUR_MASON',
    );
  });

  it('filters by status when provided to filter helper', () => {
    const filtered = filterCategoryTree(tree, { status: 'inactive' });
    expect(filtered.map((c) => c.id)).toEqual(['material']);
  });
});
