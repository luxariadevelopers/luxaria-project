import type { AccountTreeNode, AccountType } from './types';

export type AccountTreeFilter = {
  search: string;
  accountType: AccountType | '';
};

/**
 * Client-side filter that preserves ancestors of matching nodes so the
 * hierarchy remains browsable after search / type filter.
 */
export function filterAccountTree(
  nodes: readonly AccountTreeNode[],
  filter: AccountTreeFilter,
): AccountTreeNode[] {
  const q = filter.search.trim().toLowerCase();
  const type = filter.accountType;

  if (!q && !type) {
    return nodes.map((n) => ({ ...n, children: [...n.children] }));
  }

  const walk = (list: readonly AccountTreeNode[]): AccountTreeNode[] => {
    const out: AccountTreeNode[] = [];
    for (const n of list) {
      const children = walk(n.children);
      const selfMatch =
        (!type || n.accountType === type) &&
        (!q ||
          n.accountCode.toLowerCase().includes(q) ||
          n.accountName.toLowerCase().includes(q) ||
          n.accountCategory.toLowerCase().includes(q));

      if (selfMatch || children.length > 0) {
        out.push({ ...n, children });
      }
    }
    return out;
  };

  return walk(nodes);
}
