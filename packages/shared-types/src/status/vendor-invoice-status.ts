/**
 * Source: `apps/backend/src/modules/vendor-invoices/schemas/vendor-invoice.schema.ts`
 * Transitions: `vendor-invoices.service.ts`.
 */
import { createStatusCatalog } from './create-status-catalog';

export const VendorInvoiceStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Verification: 'verification',
  Matching: 'matching',
  Approval: 'approval',
  Posted: 'posted',
  Paid: 'paid',
  Cancelled: 'cancelled',
} as const;

export type VendorInvoiceStatus =
  (typeof VendorInvoiceStatus)[keyof typeof VendorInvoiceStatus];

export const VendorInvoiceMatchingStatus = {
  Pending: 'pending',
  Matched: 'matched',
  MatchedWithTolerance: 'matched_with_tolerance',
  Exception: 'exception',
  Rejected: 'rejected',
} as const;

export type VendorInvoiceMatchingStatus =
  (typeof VendorInvoiceMatchingStatus)[keyof typeof VendorInvoiceMatchingStatus];

export const vendorInvoiceStatusCatalog = createStatusCatalog({
  values: Object.values(VendorInvoiceStatus) as VendorInvoiceStatus[],
  labels: {
    draft: 'Draft',
    submitted: 'Submitted',
    verification: 'Verification',
    matching: 'Matching',
    approval: 'Approval',
    posted: 'Posted',
    paid: 'Paid',
    cancelled: 'Cancelled',
  },
  badgeVariants: {
    draft: 'neutral',
    submitted: 'info',
    verification: 'info',
    matching: 'warning',
    approval: 'warning',
    posted: 'success',
    paid: 'success',
    cancelled: 'muted',
  },
  transitions: {
    draft: ['submitted', 'cancelled'],
    submitted: ['verification', 'cancelled'],
    verification: ['matching', 'cancelled'],
    matching: ['approval', 'cancelled'],
    approval: ['posted', 'cancelled'],
    posted: ['paid'],
    paid: [],
    cancelled: [],
  },
  editable: ['draft'],
  immutable: ['posted', 'paid', 'cancelled'],
});

export const vendorInvoiceMatchingStatusCatalog = createStatusCatalog({
  values: Object.values(
    VendorInvoiceMatchingStatus,
  ) as VendorInvoiceMatchingStatus[],
  labels: {
    pending: 'Pending',
    matched: 'Matched',
    matched_with_tolerance: 'Matched (Tolerance)',
    exception: 'Exception',
    rejected: 'Rejected',
  },
  badgeVariants: {
    pending: 'warning',
    matched: 'success',
    matched_with_tolerance: 'info',
    exception: 'danger',
    rejected: 'danger',
  },
  transitions: {
    pending: ['matched', 'matched_with_tolerance', 'exception', 'rejected'],
    matched: [],
    matched_with_tolerance: [],
    exception: ['matched', 'matched_with_tolerance', 'rejected'],
    rejected: [],
  },
});
