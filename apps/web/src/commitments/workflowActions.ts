import { CommitmentStatus, type PublicCommitment } from './types';
import type { CommitmentCapabilities } from './roleAccess';

export type CommitmentRowActionId =
  | 'submit'
  | 'approve'
  | 'amend'
  | 'cancel'
  | 'record_receipt';

/**
 * Status + permission gate for list / detail actions.
 * Nest still enforces transitions and self-approve rules.
 */
export function resolveCommitmentRowActions(
  row: PublicCommitment,
  caps: CommitmentCapabilities,
): CommitmentRowActionId[] {
  const actions: CommitmentRowActionId[] = [];

  if (row.status === CommitmentStatus.Draft && caps.canSubmit) {
    actions.push('submit');
  }
  if (row.status === CommitmentStatus.Submitted && caps.canApprove) {
    actions.push('approve');
  }
  if (row.status === CommitmentStatus.Approved && caps.canAmend) {
    actions.push('amend');
  }
  if (
    caps.canCancel &&
    (row.status === CommitmentStatus.Draft ||
      row.status === CommitmentStatus.Submitted ||
      (row.status === CommitmentStatus.Approved && row.receivedAmount <= 0))
  ) {
    actions.push('cancel');
  }
  if (
    caps.canRecordReceipt &&
    row.status === CommitmentStatus.Approved &&
    row.pendingAmount > 0
  ) {
    actions.push('record_receipt');
  }

  return actions;
}
