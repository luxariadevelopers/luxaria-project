import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import { cancellationStatusLabel } from './labels';
import {
  BookingCancellationStatus,
  type PublicBookingCancellation,
} from './types';

function event(partial: {
  id: string;
  action: string;
  actionLabel: string;
  at: string | null;
  actorId?: string | null;
  comment?: string | null;
  from?: string | null;
  to?: string | null;
}): WorkflowTimelineEvent {
  return {
    id: partial.id,
    kind: 'status',
    source: 'provided',
    action: partial.action,
    actionLabel: partial.actionLabel,
    at: partial.at,
    actor: {
      id: partial.actorId ?? null,
      displayName: partial.actorId ? 'User' : 'System',
    },
    comment: partial.comment ?? null,
    documents: [],
    statusTransition:
      partial.from != null || partial.to != null
        ? { from: partial.from ?? null, to: partial.to ?? null }
        : null,
    stepNumber: null,
    metadata: null,
  };
}

/**
 * Client lifecycle timeline from cancellation fields.
 * Nest has no dedicated timeline endpoint for booking cancellations.
 */
export function buildCancellationTimeline(
  row: PublicBookingCancellation,
): WorkflowTimelineEvent[] {
  const events: WorkflowTimelineEvent[] = [];

  events.push(
    event({
      id: `${row.id}-requested`,
      action: 'requested',
      actionLabel: 'Cancellation requested',
      at: row.createdAt ?? row.cancellationDate,
      to: cancellationStatusLabel(BookingCancellationStatus.Requested),
      comment: row.cancellationReason,
    }),
  );

  if (row.reviewedAt) {
    events.push(
      event({
        id: `${row.id}-reviewed`,
        action: 'reviewed',
        actionLabel: 'Reviewed',
        at: row.reviewedAt,
        actorId: row.reviewedBy,
        from: cancellationStatusLabel(BookingCancellationStatus.Requested),
        to: cancellationStatusLabel(BookingCancellationStatus.Reviewed),
        comment: row.remarks,
      }),
    );
  }

  if (
    row.status === BookingCancellationStatus.PendingApproval ||
    row.approvalRequestId
  ) {
    events.push(
      event({
        id: `${row.id}-pending-approval`,
        action: 'submit_approval',
        actionLabel: 'Submitted for approval',
        at: row.reviewedAt ?? row.updatedAt ?? null,
        to: cancellationStatusLabel(BookingCancellationStatus.PendingApproval),
        comment: row.approvalRequestId
          ? `Approval ${row.approvalRequestId}`
          : null,
      }),
    );
  }

  if (row.approvedAt) {
    events.push(
      event({
        id: `${row.id}-approved`,
        action: 'approved',
        actionLabel: 'Approved',
        at: row.approvedAt,
        actorId: row.approvedBy,
        to: cancellationStatusLabel(BookingCancellationStatus.Approved),
      }),
    );
  }

  if (row.refundProcessedAt) {
    events.push(
      event({
        id: `${row.id}-refund`,
        action: 'process_refund',
        actionLabel: 'Refund processed',
        at: row.refundProcessedAt,
        actorId: row.refundProcessedBy,
        from: cancellationStatusLabel(BookingCancellationStatus.Approved),
        to: cancellationStatusLabel(BookingCancellationStatus.RefundProcessed),
        comment: [
          row.refundTransactionId
            ? `Txn ${row.refundTransactionId}`
            : null,
          row.journalEntryId ? `Journal ${row.journalEntryId}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || null,
      }),
    );
  }

  if (row.unitReleasedAt) {
    events.push(
      event({
        id: `${row.id}-unit-released`,
        action: 'release_unit',
        actionLabel: 'Unit released',
        at: row.unitReleasedAt,
        actorId: row.unitReleasedBy,
        to: cancellationStatusLabel(BookingCancellationStatus.UnitReleased),
        comment: 'Booking cancelled; unit available again',
      }),
    );
  }

  if (row.status === BookingCancellationStatus.Rejected) {
    events.push(
      event({
        id: `${row.id}-rejected`,
        action: 'rejected',
        actionLabel: 'Rejected',
        at: row.updatedAt ?? null,
        to: cancellationStatusLabel(BookingCancellationStatus.Rejected),
        comment: row.remarks,
      }),
    );
  }

  if (row.status === BookingCancellationStatus.Cancelled) {
    events.push(
      event({
        id: `${row.id}-cancelled`,
        action: 'cancelled',
        actionLabel: 'Cancelled',
        at: row.updatedAt ?? null,
        to: cancellationStatusLabel(BookingCancellationStatus.Cancelled),
        comment: row.remarks,
      }),
    );
  }

  return events.sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : 0;
    const tb = b.at ? Date.parse(b.at) : 0;
    return ta - tb;
  });
}
