/**
 * Source: `apps/backend/src/modules/goods-receipts/schemas/goods-receipt.schema.ts`
 * Transitions: `goods-receipts.service.ts`.
 */
import { createStatusCatalog } from './create-status-catalog';

export const GoodsReceiptStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  QualityCheck: 'quality_check',
  Accepted: 'accepted',
  PartiallyAccepted: 'partially_accepted',
  Rejected: 'rejected',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type GoodsReceiptStatus =
  (typeof GoodsReceiptStatus)[keyof typeof GoodsReceiptStatus];

export const goodsReceiptStatusCatalog = createStatusCatalog({
  values: Object.values(GoodsReceiptStatus) as GoodsReceiptStatus[],
  labels: {
    draft: 'Draft',
    submitted: 'Submitted',
    quality_check: 'Quality Check',
    accepted: 'Accepted',
    partially_accepted: 'Partially Accepted',
    rejected: 'Rejected',
    posted: 'Posted',
    cancelled: 'Cancelled',
  },
  badgeVariants: {
    draft: 'neutral',
    submitted: 'info',
    quality_check: 'warning',
    accepted: 'success',
    partially_accepted: 'warning',
    rejected: 'danger',
    posted: 'success',
    cancelled: 'muted',
  },
  transitions: {
    draft: ['submitted', 'cancelled'],
    submitted: [
      'quality_check',
      'accepted',
      'partially_accepted',
      'rejected',
      'cancelled',
    ],
    quality_check: [
      'accepted',
      'partially_accepted',
      'rejected',
      'cancelled',
    ],
    accepted: ['posted', 'cancelled'],
    partially_accepted: ['posted', 'cancelled'],
    rejected: ['cancelled'],
    posted: [],
    cancelled: [],
  },
  editable: ['draft'],
  immutable: ['posted', 'cancelled'],
});
