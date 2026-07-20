import type { VendorInvoiceCapabilities } from './roleAccess';
import {
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
  type PublicVendorInvoice,
} from './types';

export type VendorInvoiceActionId =
  | 'edit'
  | 'submit'
  | 'verify'
  | 'match'
  | 'reject_matching'
  | 'approve'
  | 'post'
  | 'mark_paid'
  | 'cancel'
  | 'upload_document';

/**
 * Status + permission gate for list/detail/match actions.
 * Nest still enforces transitions authoritatively.
 *
 * Workflow: Draft → Submitted → Verification → Matching → Approval → Posted → Paid
 */
export function resolveVendorInvoiceActions(
  row: Pick<
    PublicVendorInvoice,
    'status' | 'matchingStatus' | 'exceptionApproved'
  >,
  caps: VendorInvoiceCapabilities,
): VendorInvoiceActionId[] {
  const actions: VendorInvoiceActionId[] = [];

  if (caps.canCreate && row.status === VendorInvoiceStatus.Draft) {
    actions.push('edit');
    if (caps.canUploadDocument) {
      actions.push('upload_document');
    }
    actions.push('submit');
  }

  if (caps.canVerify && row.status === VendorInvoiceStatus.Submitted) {
    actions.push('verify');
  }

  if (
    caps.canMatch &&
    (row.status === VendorInvoiceStatus.Verification ||
      (row.status === VendorInvoiceStatus.Matching &&
        row.matchingStatus === VendorInvoiceMatchingStatus.Rejected))
  ) {
    actions.push('match');
  }

  if (
    caps.canMatch &&
    row.status === VendorInvoiceStatus.Matching &&
    row.matchingStatus !== VendorInvoiceMatchingStatus.Rejected
  ) {
    actions.push('reject_matching');
  }

  if (
    caps.canApprove &&
    row.status === VendorInvoiceStatus.Matching &&
    row.matchingStatus !== VendorInvoiceMatchingStatus.Rejected &&
    row.matchingStatus !== VendorInvoiceMatchingStatus.Pending
  ) {
    actions.push('approve');
  }

  if (caps.canPost && row.status === VendorInvoiceStatus.Approval) {
    actions.push('post');
  }

  if (
    caps.canMarkPaid &&
    row.status === VendorInvoiceStatus.Posted &&
    (row.matchingStatus === VendorInvoiceMatchingStatus.Matched ||
      row.matchingStatus ===
        VendorInvoiceMatchingStatus.MatchedWithTolerance ||
      (row.matchingStatus === VendorInvoiceMatchingStatus.Exception &&
        row.exceptionApproved))
  ) {
    actions.push('mark_paid');
  }

  if (
    caps.canCreate &&
    row.status !== VendorInvoiceStatus.Posted &&
    row.status !== VendorInvoiceStatus.Paid &&
    row.status !== VendorInvoiceStatus.Cancelled
  ) {
    actions.push('cancel');
  }

  return actions;
}

/** Client preview of Nest `assertInvoicePaymentAllowed`. */
export function isInvoicePayableForPayment(
  row: Pick<
    PublicVendorInvoice,
    'status' | 'matchingStatus' | 'exceptionApproved'
  >,
): { ok: true } | { ok: false; message: string } {
  if (row.status !== VendorInvoiceStatus.Posted) {
    return { ok: false, message: 'Only posted invoices can be paid.' };
  }
  if (row.matchingStatus === VendorInvoiceMatchingStatus.Rejected) {
    return {
      ok: false,
      message: 'Payment blocked: three-way matching was rejected.',
    };
  }
  if (row.matchingStatus === VendorInvoiceMatchingStatus.Pending) {
    return {
      ok: false,
      message: 'Payment blocked: three-way matching has not been completed.',
    };
  }
  if (
    row.matchingStatus === VendorInvoiceMatchingStatus.Exception &&
    !row.exceptionApproved
  ) {
    return {
      ok: false,
      message:
        'Payment blocked: matching exceptions require approval before payment.',
    };
  }
  return { ok: true };
}
