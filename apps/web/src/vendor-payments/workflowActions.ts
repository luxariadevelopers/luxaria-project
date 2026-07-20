import type { VendorPaymentCapabilities } from './roleAccess';
import { VendorPaymentStatus, type PublicVendorPayment } from './types';

export type VendorPaymentActionId =
  | 'edit'
  | 'submit'
  | 'approve'
  | 'release'
  | 'verify'
  | 'post'
  | 'cancel'
  | 'upload_proof';

/**
 * Draft → Approval → Released → Verified → Posted
 *
 * Nest: `approve` moves Approval → Released; `release` records bank release
 * (`releasedBy`) while status stays Released; then verify → post.
 */
export function resolveVendorPaymentActions(
  row: Pick<PublicVendorPayment, 'status'>,
  caps: VendorPaymentCapabilities,
): VendorPaymentActionId[] {
  const actions: VendorPaymentActionId[] = [];

  if (caps.canCreate && row.status === VendorPaymentStatus.Draft) {
    actions.push('edit');
    if (caps.canUploadDocument) {
      actions.push('upload_proof');
    }
    actions.push('submit');
  }

  if (caps.canApprove && row.status === VendorPaymentStatus.Approval) {
    actions.push('approve');
  }

  if (caps.canBankRelease && row.status === VendorPaymentStatus.Released) {
    actions.push('release');
  }

  if (caps.canVerify && row.status === VendorPaymentStatus.Released) {
    actions.push('verify');
  }

  if (caps.canPost && row.status === VendorPaymentStatus.Verified) {
    actions.push('post');
  }

  if (
    caps.canCancel &&
    row.status !== VendorPaymentStatus.Posted &&
    row.status !== VendorPaymentStatus.Cancelled
  ) {
    actions.push('cancel');
  }

  return actions;
}
