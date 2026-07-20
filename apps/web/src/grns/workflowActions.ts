import type { GrnCapabilities } from './roleAccess';
import { GoodsReceiptStatus, type PublicGoodsReceipt } from './types';

export type GrnRowActionId = 'quality_check' | 'accept' | 'post';

/**
 * Status + permission gate for list/detail actions.
 * Nest still enforces transitions (`submitted` → QC → accept → post).
 */
export function resolveGrnRowActions(
  row: Pick<PublicGoodsReceipt, 'status'>,
  caps: GrnCapabilities,
): GrnRowActionId[] {
  const actions: GrnRowActionId[] = [];

  if (row.status === GoodsReceiptStatus.Submitted && caps.canQc) {
    actions.push('quality_check');
  }
  if (
    (row.status === GoodsReceiptStatus.Submitted ||
      row.status === GoodsReceiptStatus.QualityCheck) &&
    caps.canAccept
  ) {
    actions.push('accept');
  }
  if (
    (row.status === GoodsReceiptStatus.Accepted ||
      row.status === GoodsReceiptStatus.PartiallyAccepted) &&
    caps.canPost
  ) {
    actions.push('post');
  }

  return actions;
}

export function isGrnPosted(
  row: Pick<PublicGoodsReceipt, 'status' | 'postedAt'>,
): boolean {
  return (
    row.status === GoodsReceiptStatus.Posted && Boolean(row.postedAt)
  );
}
