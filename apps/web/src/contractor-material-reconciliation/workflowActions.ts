import type { MaterialReconciliationCapabilities } from './roleAccess';
import type { PublicMaterialReconciliation } from './api';

export type MaterialReconciliationActionId = 'approve' | 'post_to_bill';

export function resolveMaterialReconciliationActions(
  row: PublicMaterialReconciliation,
  caps: MaterialReconciliationCapabilities,
): MaterialReconciliationActionId[] {
  const actions: MaterialReconciliationActionId[] = [];

  if (caps.canManage && row.status === 'draft') {
    actions.push('approve');
  }

  /** Nest `POST …/post-to-bill` — approved only (`contractor_recovery.manage`). */
  if (caps.canManage && row.status === 'approved') {
    actions.push('post_to_bill');
  }

  return actions;
}
