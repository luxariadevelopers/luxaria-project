/**
 * Source: `apps/backend/src/modules/approvals/schemas/approval-request.schema.ts`
 * Transitions: `approvals.service.ts` (submit / act / cancel).
 */
import { createStatusCatalog } from './create-status-catalog';

export const ApprovalStatus = {
  Draft: 'draft',
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
  Returned: 'returned',
} as const;

export type ApprovalStatus =
  (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const approvalStatusCatalog = createStatusCatalog({
  values: Object.values(ApprovalStatus) as ApprovalStatus[],
  labels: {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    returned: 'Returned',
  },
  badgeVariants: {
    draft: 'neutral',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'muted',
    returned: 'info',
  },
  transitions: {
    draft: ['pending', 'cancelled'],
    pending: ['approved', 'rejected', 'returned', 'cancelled', 'pending'],
    approved: [],
    rejected: [],
    cancelled: [],
    returned: ['pending', 'cancelled'],
  },
  editable: ['draft', 'returned'],
  immutable: ['approved', 'rejected', 'cancelled'],
});
