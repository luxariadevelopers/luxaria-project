import type { ExpenseCapabilities } from './roleAccess';
import {
  SiteExpenseVoucherStatus,
  type PublicSiteExpenseVoucher,
} from './types';
import { isExpenseEditable } from './validation';

export type ExpenseRowActionId = 'verify' | 'approve' | 'post';

export type ExpenseDetailActionId =
  | 'submit'
  | 'verify'
  | 'approve'
  | 'reject'
  | 'return'
  | 'post'
  | 'cancel';

/**
 * Status + permission gate for list review actions.
 * Nest still enforces transitions and segregation of duties.
 * Posted vouchers never receive actions (immutable).
 */
export function resolveExpenseRowActions(
  row: PublicSiteExpenseVoucher,
  caps: ExpenseCapabilities,
): ExpenseRowActionId[] {
  if (isExpensePosted(row)) return [];

  const actions: ExpenseRowActionId[] = [];

  if (
    row.status === SiteExpenseVoucherStatus.Submitted &&
    caps.canVerify
  ) {
    actions.push('verify');
  }
  if (
    row.status === SiteExpenseVoucherStatus.Verified &&
    caps.canApprove
  ) {
    actions.push('approve');
  }
  if (row.status === SiteExpenseVoucherStatus.Approved && caps.canPost) {
    actions.push('post');
  }

  return actions;
}

/**
 * Status + permission gate for detail actions (Phase 053).
 * Nest still enforces transitions and segregation of duties.
 */
export function resolveExpenseDetailActions(
  row: Pick<PublicSiteExpenseVoucher, 'status'>,
  caps: ExpenseCapabilities,
): ExpenseDetailActionId[] {
  const actions: ExpenseDetailActionId[] = [];
  const { status } = row;

  if (
    caps.canCreate &&
    (status === SiteExpenseVoucherStatus.Draft ||
      status === SiteExpenseVoucherStatus.Returned)
  ) {
    actions.push('submit');
  }

  if (status === SiteExpenseVoucherStatus.Submitted && caps.canVerify) {
    actions.push('verify', 'reject', 'return');
  }

  if (status === SiteExpenseVoucherStatus.Verified && caps.canApprove) {
    actions.push('approve', 'reject', 'return');
  }

  if (status === SiteExpenseVoucherStatus.Approved && caps.canPost) {
    actions.push('post');
  }

  if (
    caps.canCancel &&
    (status === SiteExpenseVoucherStatus.Draft ||
      status === SiteExpenseVoucherStatus.Submitted ||
      status === SiteExpenseVoucherStatus.Verified ||
      status === SiteExpenseVoucherStatus.Approved ||
      status === SiteExpenseVoucherStatus.Returned)
  ) {
    actions.push('cancel');
  }

  return actions;
}

/** Posted vouchers are immutable — evidence and amounts must not change. */
export function isExpensePosted(
  row: Pick<PublicSiteExpenseVoucher, 'status' | 'journalEntryId' | 'postedAt'>,
): boolean {
  return (
    row.status === SiteExpenseVoucherStatus.Posted &&
    (Boolean(row.journalEntryId) || Boolean(row.postedAt))
  );
}

export function isExpenseEvidenceReadOnly(status: string): boolean {
  return (
    status !== SiteExpenseVoucherStatus.Draft &&
    status !== SiteExpenseVoucherStatus.Returned
  );
}

export { isExpenseEditable };
