/**
 * Source: `apps/backend/src/modules/site-expense-vouchers/schemas/site-expense-voucher.schema.ts`
 * Transitions / editable: `site-expense-vouchers.service.ts`.
 */
import { createStatusCatalog } from './create-status-catalog';

export const SiteExpenseVoucherStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Verified: 'verified',
  Approved: 'approved',
  Posted: 'posted',
  Rejected: 'rejected',
  Returned: 'returned',
  Cancelled: 'cancelled',
} as const;

export type SiteExpenseVoucherStatus =
  (typeof SiteExpenseVoucherStatus)[keyof typeof SiteExpenseVoucherStatus];

export const siteExpenseVoucherStatusCatalog = createStatusCatalog({
  values: Object.values(SiteExpenseVoucherStatus) as SiteExpenseVoucherStatus[],
  labels: {
    draft: 'Draft',
    submitted: 'Submitted',
    verified: 'Verified',
    approved: 'Approved',
    posted: 'Posted',
    rejected: 'Rejected',
    returned: 'Returned',
    cancelled: 'Cancelled',
  },
  badgeVariants: {
    draft: 'neutral',
    submitted: 'info',
    verified: 'info',
    approved: 'warning',
    posted: 'success',
    rejected: 'danger',
    returned: 'warning',
    cancelled: 'muted',
  },
  transitions: {
    draft: ['submitted', 'cancelled'],
    submitted: ['verified', 'rejected', 'returned', 'cancelled'],
    verified: ['approved', 'rejected', 'returned', 'cancelled'],
    approved: ['posted', 'cancelled'],
    posted: [],
    rejected: [],
    returned: ['draft', 'submitted', 'cancelled'],
    cancelled: [],
  },
  editable: ['draft', 'returned'],
  immutable: ['posted', 'cancelled', 'rejected'],
});
