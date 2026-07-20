/**
 * Source: `apps/backend/src/modules/purchase-orders/schemas/purchase-order.schema.ts`
 * Transitions: `purchase-orders.service.ts`.
 */
import { createStatusCatalog } from './create-status-catalog';

export const PurchaseOrderStatus = {
  Draft: 'draft',
  PendingApproval: 'pending_approval',
  Issued: 'issued',
  PartiallyReceived: 'partially_received',
  FullyReceived: 'fully_received',
  Closed: 'closed',
  Cancelled: 'cancelled',
  Superseded: 'superseded',
  Rejected: 'rejected',
} as const;

export type PurchaseOrderStatus =
  (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const purchaseOrderStatusCatalog = createStatusCatalog({
  values: Object.values(PurchaseOrderStatus) as PurchaseOrderStatus[],
  labels: {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    issued: 'Issued',
    partially_received: 'Partially Received',
    fully_received: 'Fully Received',
    closed: 'Closed',
    cancelled: 'Cancelled',
    superseded: 'Superseded',
    rejected: 'Rejected',
  },
  badgeVariants: {
    draft: 'neutral',
    pending_approval: 'warning',
    issued: 'info',
    partially_received: 'warning',
    fully_received: 'success',
    closed: 'muted',
    cancelled: 'muted',
    superseded: 'muted',
    rejected: 'danger',
  },
  transitions: {
    draft: ['pending_approval', 'cancelled'],
    pending_approval: ['issued', 'rejected'],
    issued: [
      'partially_received',
      'fully_received',
      'closed',
      'cancelled',
      'superseded',
    ],
    partially_received: ['fully_received', 'closed', 'cancelled'],
    fully_received: ['closed'],
    closed: [],
    cancelled: [],
    superseded: [],
    rejected: ['pending_approval'],
  },
  editable: ['draft', 'rejected'],
  immutable: ['closed', 'cancelled', 'superseded', 'fully_received'],
});
