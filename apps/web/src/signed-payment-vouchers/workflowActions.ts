import { SignedPaymentVoucherStatus } from '@luxaria/shared-types';
import type { SignedPaymentVoucherCapabilities } from './roleAccess';
import type { PublicSignedPaymentVoucher } from './types';

export type SignedPaymentVoucherRowActionId = 'approve' | 'post';

export type SignedPaymentVoucherDetailActionId =
  | 'approve'
  | 'post'
  | 'reverse'
  | 'cancel';

export function isSignedPaymentVoucherPosted(
  row: Pick<PublicSignedPaymentVoucher, 'status'>,
): boolean {
  return (
    row.status === SignedPaymentVoucherStatus.Posted ||
    row.status === SignedPaymentVoucherStatus.Reversed
  );
}

export function resolveSignedPaymentVoucherRowActions(
  row: PublicSignedPaymentVoucher,
  caps: SignedPaymentVoucherCapabilities,
): SignedPaymentVoucherRowActionId[] {
  if (isSignedPaymentVoucherPosted(row)) return [];

  const actions: SignedPaymentVoucherRowActionId[] = [];

  if (
    row.status === SignedPaymentVoucherStatus.Submitted &&
    caps.canApprove
  ) {
    actions.push('approve');
  }
  if (row.status === SignedPaymentVoucherStatus.Approved && caps.canApprove) {
    actions.push('post');
  }

  return actions;
}

export function resolveSignedPaymentVoucherDetailActions(
  row: Pick<PublicSignedPaymentVoucher, 'status'>,
  caps: SignedPaymentVoucherCapabilities,
): SignedPaymentVoucherDetailActionId[] {
  const actions: SignedPaymentVoucherDetailActionId[] = [];
  const { status } = row;

  if (status === SignedPaymentVoucherStatus.Submitted && caps.canApprove) {
    actions.push('approve');
  }

  if (status === SignedPaymentVoucherStatus.Approved && caps.canApprove) {
    actions.push('post');
  }

  if (status === SignedPaymentVoucherStatus.Posted && caps.canApprove) {
    actions.push('reverse');
  }

  if (
    caps.canRelease &&
    (status === SignedPaymentVoucherStatus.Draft ||
      status === SignedPaymentVoucherStatus.Submitted ||
      status === SignedPaymentVoucherStatus.Approved ||
      status === SignedPaymentVoucherStatus.Returned)
  ) {
    actions.push('cancel');
  }

  return actions;
}
