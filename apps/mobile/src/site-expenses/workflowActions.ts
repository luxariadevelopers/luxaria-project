import type { ExpenseCapabilities } from './permissions';
import { SiteExpenseVoucherStatus, type PublicSiteExpenseVoucher } from './types';

export type ExpenseDetailActionId =
  | 'submit'
  | 'verify'
  | 'approve'
  | 'reject'
  | 'return'
  | 'post'
  | 'cancel';

/**
 * Status + permission gate for detail actions.
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

export function isExpensePosted(
  row: Pick<PublicSiteExpenseVoucher, 'status' | 'journalEntryId' | 'postedAt'>,
): boolean {
  return (
    row.status === SiteExpenseVoucherStatus.Posted &&
    (Boolean(row.journalEntryId) || Boolean(row.postedAt))
  );
}

export function isExpenseEditable(
  row: Pick<PublicSiteExpenseVoucher, 'status'>,
): boolean {
  return (
    row.status === SiteExpenseVoucherStatus.Draft ||
    row.status === SiteExpenseVoucherStatus.Returned
  );
}
