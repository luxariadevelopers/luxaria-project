import type { AccountTreeNode, PublicAccount } from './types';
import { countActiveChildren } from './hierarchy';

/**
 * Nest protected / restricted account rules (UI preview).
 * Server remains authoritative.
 */
export type AccountControlFlags = {
  /** Seeded system account — cannot delete; cannot change accountType. */
  isProtectedSystem: boolean;
  canEditType: boolean;
  canDelete: boolean;
  canDeactivate: boolean;
  deleteBlockedReason: string | null;
  deactivateBlockedReason: string | null;
};

export function resolveAccountControls(
  account: PublicAccount,
  treeNode?: AccountTreeNode | null,
): AccountControlFlags {
  const isProtectedSystem = account.isSystem;
  const hasChildren = Boolean(treeNode && treeNode.children.length > 0);
  const activeChildren = treeNode ? countActiveChildren(treeNode) : 0;

  let deleteBlockedReason: string | null = null;
  if (isProtectedSystem) {
    deleteBlockedReason = 'System-seeded accounts cannot be deleted.';
  } else if (account.postingCount > 0) {
    deleteBlockedReason = 'Accounts with postings cannot be deleted.';
  } else if (hasChildren) {
    deleteBlockedReason = 'Move or delete child accounts first.';
  }

  let deactivateBlockedReason: string | null = null;
  if (account.status === 'inactive') {
    deactivateBlockedReason = null;
  } else if (activeChildren > 0) {
    deactivateBlockedReason =
      'Deactivate child accounts before deactivating a parent.';
  }

  return {
    isProtectedSystem,
    canEditType: !isProtectedSystem,
    canDelete: deleteBlockedReason == null,
    canDeactivate:
      account.status === 'active' && deactivateBlockedReason == null,
    deleteBlockedReason,
    deactivateBlockedReason,
  };
}

/** Parent must share account type (Nest rule). */
export function isValidParentType(
  childType: string,
  parent: Pick<PublicAccount, 'accountType'> | null | undefined,
): boolean {
  if (!parent) return true;
  return parent.accountType === childType;
}
