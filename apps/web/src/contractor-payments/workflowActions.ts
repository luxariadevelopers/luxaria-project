import type { ContractorPaymentCapabilities } from './roleAccess';
import {
  ContractorPaymentStatus,
  type PublicContractorPayment,
} from './types';

export type ContractorPaymentActionId =
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
 * (`releasedBy`; requires paymentProof + transactionReference); then
 * verify → post.
 */
export function resolveContractorPaymentActions(
  row: Pick<
    PublicContractorPayment,
    'status' | 'releasedBy' | 'paymentProof' | 'transactionReference'
  >,
  caps: ContractorPaymentCapabilities,
): ContractorPaymentActionId[] {
  const actions: ContractorPaymentActionId[] = [];

  if (caps.canCreate && row.status === ContractorPaymentStatus.Draft) {
    actions.push('edit');
    if (caps.canUploadDocument) {
      actions.push('upload_proof');
    }
    actions.push('submit');
  }

  if (caps.canApprove && row.status === ContractorPaymentStatus.Approval) {
    actions.push('approve');
  }

  if (
    caps.canBankRelease &&
    row.status === ContractorPaymentStatus.Released &&
    !row.releasedBy &&
    Boolean(row.paymentProof?.trim()) &&
    Boolean(row.transactionReference?.trim())
  ) {
    actions.push('release');
  }

  if (
    caps.canVerify &&
    row.status === ContractorPaymentStatus.Released &&
    Boolean(row.releasedBy)
  ) {
    actions.push('verify');
  }

  if (caps.canPost && row.status === ContractorPaymentStatus.Verified) {
    actions.push('post');
  }

  if (
    caps.canCancel &&
    row.status !== ContractorPaymentStatus.Posted &&
    row.status !== ContractorPaymentStatus.Cancelled
  ) {
    actions.push('cancel');
  }

  return actions;
}
