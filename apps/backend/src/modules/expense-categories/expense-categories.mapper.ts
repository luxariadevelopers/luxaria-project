import type { Types } from 'mongoose';
import type { ExpenseCategoryStatus } from './schemas/expense-category.schema';

export type PublicExpenseCategory = {
  id: string;
  categoryCode: string;
  name: string;
  parentCategoryId: string | null;
  level: number;
  defaultLedgerAccountId: string | null;
  requiresBill: boolean;
  requiresSignature: boolean;
  requiresPhoto: boolean;
  approvalLimit: number | null;
  status: ExpenseCategoryStatus;
  isSystem: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ExpenseCategoryTreeNode = PublicExpenseCategory & {
  children: ExpenseCategoryTreeNode[];
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicExpenseCategory(row: {
  _id: Types.ObjectId | string;
  categoryCode: string;
  name: string;
  parentCategoryId?: Types.ObjectId | string | null;
  level: number;
  defaultLedgerAccountId?: Types.ObjectId | string | null;
  requiresBill?: boolean;
  requiresSignature?: boolean;
  requiresPhoto?: boolean;
  approvalLimit?: number | null;
  status: ExpenseCategoryStatus;
  isSystem?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicExpenseCategory {
  return {
    id: String(row._id),
    categoryCode: row.categoryCode,
    name: row.name,
    parentCategoryId: oid(row.parentCategoryId),
    level: row.level,
    defaultLedgerAccountId: oid(row.defaultLedgerAccountId),
    requiresBill: Boolean(row.requiresBill),
    requiresSignature: Boolean(row.requiresSignature),
    requiresPhoto: Boolean(row.requiresPhoto),
    approvalLimit:
      row.approvalLimit === undefined || row.approvalLimit === null
        ? null
        : row.approvalLimit,
    status: row.status,
    isSystem: Boolean(row.isSystem),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function buildExpenseCategoryTree(
  categories: PublicExpenseCategory[],
): ExpenseCategoryTreeNode[] {
  const byId = new Map<string, ExpenseCategoryTreeNode>();
  for (const c of categories) {
    byId.set(c.id, { ...c, children: [] });
  }

  const roots: ExpenseCategoryTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentCategoryId && byId.has(node.parentCategoryId)) {
      byId.get(node.parentCategoryId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: ExpenseCategoryTreeNode[]) => {
    nodes.sort((a, b) => a.categoryCode.localeCompare(b.categoryCode));
    for (const n of nodes) sortRecursive(n.children);
  };
  sortRecursive(roots);
  return roots;
}
