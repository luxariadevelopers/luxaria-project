import { canProcessRefund, canReleaseUnit } from './refundMath';
import type { BookingCancellationCapabilities } from './roleAccess';
import {
  BookingCancellationStatus,
  type PublicBookingCancellation,
} from './types';

export type CancellationActionId =
  | 'review'
  | 'submit_approval'
  | 'approve'
  | 'reject'
  | 'process_refund'
  | 'release_unit'
  | 'attach_document'
  | 'open';

/**
 * Action gating mirrors Nest controller permissions + status machine.
 * Unit release never appears before the approved workflow completes.
 */
export function resolveCancellationActions(
  row: Pick<PublicBookingCancellation, 'status' | 'approvedRefund'>,
  caps: BookingCancellationCapabilities,
): CancellationActionId[] {
  const actions: CancellationActionId[] = ['open'];
  const { status } = row;

  const closed =
    status === BookingCancellationStatus.UnitReleased ||
    status === BookingCancellationStatus.Rejected ||
    status === BookingCancellationStatus.Cancelled;

  if (caps.canAttachDocument && !closed) {
    actions.push('attach_document');
  }

  if (caps.canReview && status === BookingCancellationStatus.Requested) {
    actions.push('review');
  }

  if (caps.canSubmitApproval && status === BookingCancellationStatus.Reviewed) {
    actions.push('submit_approval');
  }

  if (
    caps.canApprove &&
    (status === BookingCancellationStatus.Reviewed ||
      status === BookingCancellationStatus.PendingApproval)
  ) {
    actions.push('approve');
  }

  if (
    caps.canReject &&
    (status === BookingCancellationStatus.Requested ||
      status === BookingCancellationStatus.Reviewed ||
      status === BookingCancellationStatus.PendingApproval)
  ) {
    actions.push('reject');
  }

  if (
    caps.canRefund &&
    canProcessRefund({
      status,
      approvedRefund: row.approvedRefund,
    }).ok
  ) {
    actions.push('process_refund');
  }

  if (
    caps.canReleaseUnit &&
    canReleaseUnit({
      status,
      approvedRefund: row.approvedRefund,
    }).ok
  ) {
    actions.push('release_unit');
  }

  return actions;
}
