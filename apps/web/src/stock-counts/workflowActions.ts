import {
  canApproveStockCount,
  type StockCountCapabilities,
} from './roleAccess';
import { StockCountStatus, type PublicStockCount } from './types';

export type StockCountRowActionId =
  | 'edit'
  | 'submit'
  | 'review'
  | 'approve'
  | 'post'
  | 'cancel';

/**
 * Status + permission gate for list / detail actions.
 * Nest still enforces transitions and director approve.
 */
export function resolveStockCountRowActions(
  row: PublicStockCount,
  caps: StockCountCapabilities,
): StockCountRowActionId[] {
  const actions: StockCountRowActionId[] = [];
  const status = row.status;

  if (status === StockCountStatus.Draft && caps.canAdjust) {
    actions.push('edit', 'submit');
  }
  if (status === StockCountStatus.Submitted && caps.canAdjust) {
    actions.push('review');
  }
  if (
    status === StockCountStatus.Reviewed &&
    canApproveStockCount(caps, row.requiresDirectorApproval)
  ) {
    actions.push('approve');
  }
  if (status === StockCountStatus.Approved && caps.canAdjust) {
    actions.push('post');
  }
  if (
    caps.canAdjust &&
    status !== StockCountStatus.AdjustmentPosted &&
    status !== StockCountStatus.Cancelled
  ) {
    actions.push('cancel');
  }

  return actions;
}
