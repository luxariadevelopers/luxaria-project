import type { PublicContractorRecovery } from './api';
import type { ContractorRecoveryCapabilities } from './roleAccess';

export type ContractorRecoveryActionId = 'approve' | 'post';

/**
 * Status + permission gate for recovery detail actions.
 * Nest still enforces transitions and project access.
 */
export function resolveContractorRecoveryActions(
  row: PublicContractorRecovery,
  caps: ContractorRecoveryCapabilities,
): ContractorRecoveryActionId[] {
  const actions: ContractorRecoveryActionId[] = [];
  if (!caps.canManage) return actions;

  if (row.status === 'draft') {
    actions.push('approve');
  }
  if (row.status === 'approved') {
    actions.push('post');
  }
  return actions;
}
