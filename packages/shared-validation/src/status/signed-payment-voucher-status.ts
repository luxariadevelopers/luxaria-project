/**
 * Source: `apps/backend/src/modules/signed-payment-vouchers/schemas/signed-payment-voucher.schema.ts`
 * Transitions: `signed-payment-vouchers.service.ts`.
 */
import { createStatusCatalog } from './create-status-catalog';

export const SignedPaymentVoucherStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Approved: 'approved',
  Posted: 'posted',
  Reversed: 'reversed',
  Cancelled: 'cancelled',
  Returned: 'returned',
} as const;

export type SignedPaymentVoucherStatus =
  (typeof SignedPaymentVoucherStatus)[keyof typeof SignedPaymentVoucherStatus];

export const signedPaymentVoucherStatusCatalog = createStatusCatalog({
  values: Object.values(
    SignedPaymentVoucherStatus,
  ) as SignedPaymentVoucherStatus[],
  labels: {
    draft: 'Draft',
    submitted: 'Submitted',
    approved: 'Approved',
    posted: 'Posted',
    reversed: 'Reversed',
    cancelled: 'Cancelled',
    returned: 'Returned',
  },
  badgeVariants: {
    draft: 'neutral',
    submitted: 'info',
    approved: 'warning',
    posted: 'success',
    reversed: 'info',
    cancelled: 'muted',
    returned: 'warning',
  },
  transitions: {
    draft: ['submitted', 'cancelled'],
    submitted: ['approved', 'returned', 'cancelled'],
    approved: ['posted', 'cancelled'],
    posted: ['reversed'],
    reversed: [],
    cancelled: [],
    returned: ['draft', 'submitted', 'cancelled'],
  },
  editable: ['draft', 'returned'],
  immutable: ['posted', 'reversed', 'cancelled'],
});
