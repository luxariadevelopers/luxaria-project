import type { Types } from 'mongoose';
import type {
  AccountCategory,
  AccountStatus,
  AccountType,
} from './schemas/account.schema';

export type PublicAccount = {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  parentAccountId: string | null;
  level: number;
  isControlAccount: boolean;
  allowManualPosting: boolean;
  requiresProject: boolean;
  requiresParty: boolean;
  status: AccountStatus;
  postingCount: number;
  isSystem: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type AccountTreeNode = PublicAccount & {
  children: AccountTreeNode[];
};

export function toPublicAccount(row: {
  _id: Types.ObjectId | string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  parentAccountId?: Types.ObjectId | string | null;
  level: number;
  isControlAccount: boolean;
  allowManualPosting: boolean;
  requiresProject: boolean;
  requiresParty: boolean;
  status: AccountStatus;
  postingCount?: number;
  isSystem?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicAccount {
  return {
    id: String(row._id),
    accountCode: row.accountCode,
    accountName: row.accountName,
    accountType: row.accountType,
    accountCategory: row.accountCategory,
    parentAccountId: row.parentAccountId ? String(row.parentAccountId) : null,
    level: row.level,
    isControlAccount: row.isControlAccount,
    allowManualPosting: row.allowManualPosting,
    requiresProject: row.requiresProject,
    requiresParty: row.requiresParty,
    status: row.status,
    postingCount: row.postingCount ?? 0,
    isSystem: Boolean(row.isSystem),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function buildAccountTree(
  accounts: PublicAccount[],
): AccountTreeNode[] {
  const byId = new Map<string, AccountTreeNode>();
  for (const a of accounts) {
    byId.set(a.id, { ...a, children: [] });
  }

  const roots: AccountTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentAccountId && byId.has(node.parentAccountId)) {
      byId.get(node.parentAccountId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: AccountTreeNode[]) => {
    nodes.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    for (const n of nodes) sortRecursive(n.children);
  };
  sortRecursive(roots);
  return roots;
}
