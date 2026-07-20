import type { AccountTreeNode, PublicAccount } from './types';

/** Flatten tree for pickers / search. */
export function flattenAccountTree(
  nodes: readonly AccountTreeNode[],
): PublicAccount[] {
  const out: PublicAccount[] = [];
  const walk = (list: readonly AccountTreeNode[]) => {
    for (const n of list) {
      out.push(n);
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** Breadcrumb path from root → account (inclusive). */
export function buildAccountBreadcrumbs(
  nodes: readonly AccountTreeNode[],
  accountId: string,
): PublicAccount[] {
  const path: PublicAccount[] = [];

  const walk = (
    list: readonly AccountTreeNode[],
    trail: PublicAccount[],
  ): boolean => {
    for (const n of list) {
      const next = [...trail, n];
      if (n.id === accountId) {
        path.push(...next);
        return true;
      }
      if (n.children.length && walk(n.children, next)) {
        return true;
      }
    }
    return false;
  };

  walk(nodes, []);
  return path;
}

/** Collect descendant ids (excluding self) — for cycle-safe parent pickers. */
export function collectDescendantIds(
  nodes: readonly AccountTreeNode[],
  accountId: string,
): Set<string> {
  const find = (list: readonly AccountTreeNode[]): AccountTreeNode | null => {
    for (const n of list) {
      if (n.id === accountId) return n;
      const nested = find(n.children);
      if (nested) return nested;
    }
    return null;
  };

  const root = find(nodes);
  const ids = new Set<string>();
  if (!root) return ids;

  const walk = (list: readonly AccountTreeNode[]) => {
    for (const n of list) {
      ids.add(n.id);
      walk(n.children);
    }
  };
  walk(root.children);
  return ids;
}

export function countActiveChildren(node: AccountTreeNode): number {
  return node.children.filter((c) => c.status === 'active').length;
}

export function findTreeNode(
  nodes: readonly AccountTreeNode[],
  accountId: string,
): AccountTreeNode | null {
  for (const n of nodes) {
    if (n.id === accountId) return n;
    const nested = findTreeNode(n.children, accountId);
    if (nested) return nested;
  }
  return null;
}
