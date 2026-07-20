import type {
  ExpenseCategoryTreeNode,
  PublicExpenseCategory,
} from './types';

/** Flatten tree for pickers / search. */
export function flattenCategoryTree(
  nodes: readonly ExpenseCategoryTreeNode[],
): PublicExpenseCategory[] {
  const out: PublicExpenseCategory[] = [];
  const walk = (list: readonly ExpenseCategoryTreeNode[]) => {
    for (const n of list) {
      out.push(n);
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** Breadcrumb path from root → category (inclusive). */
export function buildCategoryBreadcrumbs(
  nodes: readonly ExpenseCategoryTreeNode[],
  categoryId: string,
): PublicExpenseCategory[] {
  const path: PublicExpenseCategory[] = [];

  const walk = (
    list: readonly ExpenseCategoryTreeNode[],
    trail: PublicExpenseCategory[],
  ): boolean => {
    for (const n of list) {
      const next = [...trail, n];
      if (n.id === categoryId) {
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
  nodes: readonly ExpenseCategoryTreeNode[],
  categoryId: string,
): Set<string> {
  const find = (
    list: readonly ExpenseCategoryTreeNode[],
  ): ExpenseCategoryTreeNode | null => {
    for (const n of list) {
      if (n.id === categoryId) return n;
      const nested = find(n.children);
      if (nested) return nested;
    }
    return null;
  };

  const root = find(nodes);
  const ids = new Set<string>();
  if (!root) return ids;

  const walk = (list: readonly ExpenseCategoryTreeNode[]) => {
    for (const n of list) {
      ids.add(n.id);
      walk(n.children);
    }
  };
  walk(root.children);
  return ids;
}

export function countActiveChildren(node: ExpenseCategoryTreeNode): number {
  return node.children.filter((c) => c.status === 'active').length;
}

export function findTreeNode(
  nodes: readonly ExpenseCategoryTreeNode[],
  categoryId: string,
): ExpenseCategoryTreeNode | null {
  for (const n of nodes) {
    if (n.id === categoryId) return n;
    const nested = findTreeNode(n.children, categoryId);
    if (nested) return nested;
  }
  return null;
}

export type CategoryTreeFilters = {
  search?: string;
  status?: string;
};

/** Filter tree nodes; keep ancestors of matches. */
export function filterCategoryTree(
  nodes: readonly ExpenseCategoryTreeNode[],
  filters: CategoryTreeFilters,
): ExpenseCategoryTreeNode[] {
  const search = filters.search?.trim().toLowerCase() ?? '';
  const status = filters.status?.trim() ?? '';

  const matches = (n: PublicExpenseCategory): boolean => {
    if (status && n.status !== status) return false;
    if (!search) return true;
    return (
      n.categoryCode.toLowerCase().includes(search) ||
      n.name.toLowerCase().includes(search)
    );
  };

  const walk = (
    list: readonly ExpenseCategoryTreeNode[],
  ): ExpenseCategoryTreeNode[] => {
    const out: ExpenseCategoryTreeNode[] = [];
    for (const n of list) {
      const children = walk(n.children);
      if (matches(n) || children.length > 0) {
        out.push({ ...n, children });
      }
    }
    return out;
  };

  return walk(nodes);
}
