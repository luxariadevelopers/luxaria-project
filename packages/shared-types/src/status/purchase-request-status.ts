/**
 * Source: `apps/backend/src/modules/purchase-requests/schemas/purchase-request.schema.ts`
 * Transitions: `purchase-requests.service.ts`.
 */
import { createStatusCatalog } from './create-status-catalog';

export const PurchaseRequestStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Reviewed: 'reviewed',
  Approved: 'approved',
  Sourcing: 'sourcing',
  Closed: 'closed',
  Rejected: 'rejected',
  Returned: 'returned',
  Cancelled: 'cancelled',
} as const;

export type PurchaseRequestStatus =
  (typeof PurchaseRequestStatus)[keyof typeof PurchaseRequestStatus];

export const purchaseRequestStatusCatalog = createStatusCatalog({
  values: Object.values(PurchaseRequestStatus) as PurchaseRequestStatus[],
  labels: {
    draft: 'Draft',
    submitted: 'Submitted',
    reviewed: 'Reviewed',
    approved: 'Approved',
    sourcing: 'Sourcing',
    closed: 'Closed',
    rejected: 'Rejected',
    returned: 'Returned',
    cancelled: 'Cancelled',
  },
  badgeVariants: {
    draft: 'neutral',
    submitted: 'info',
    reviewed: 'info',
    approved: 'success',
    sourcing: 'warning',
    closed: 'muted',
    rejected: 'danger',
    returned: 'warning',
    cancelled: 'muted',
  },
  transitions: {
    draft: ['submitted', 'cancelled'],
    submitted: ['reviewed', 'rejected', 'returned', 'cancelled'],
    reviewed: ['approved', 'rejected', 'returned', 'cancelled'],
    approved: ['sourcing', 'closed', 'cancelled'],
    sourcing: ['closed', 'cancelled'],
    closed: [],
    rejected: [],
    returned: ['draft', 'submitted', 'cancelled'],
    cancelled: [],
  },
  editable: ['draft', 'returned'],
  immutable: ['closed', 'cancelled', 'rejected'],
});
