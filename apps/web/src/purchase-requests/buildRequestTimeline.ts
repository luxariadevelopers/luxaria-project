import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import { purchaseRequestStatusLabel } from './labels';
import {
  PurchaseRequestStatus,
  type PublicPurchaseRequest,
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
 * Client lifecycle timeline from purchase-request fields.
 * There is no dedicated Nest timeline endpoint for purchase requests.
 */
export function buildPurchaseRequestTimeline(
  row: PublicPurchaseRequest,
): WorkflowTimelineEvent[] {
  const events: WorkflowTimelineEvent[] = [];

  events.push(
    event({
      id: `${row.id}-created`,
      action: 'created',
      actionLabel: 'Request created',
      at: row.createdAt ?? null,
      actorId: row.requestedBy,
      to: purchaseRequestStatusLabel(PurchaseRequestStatus.Draft),
      comment: row.justification,
    }),
  );

  if (
    row.status !== PurchaseRequestStatus.Draft &&
    row.status !== PurchaseRequestStatus.Cancelled
  ) {
    events.push(
      event({
        id: `${row.id}-submitted`,
        action: 'submitted',
        actionLabel: 'Submitted for review',
        at: row.updatedAt ?? row.createdAt ?? null,
        actorId: row.requestedBy,
        from: purchaseRequestStatusLabel(PurchaseRequestStatus.Draft),
        to: purchaseRequestStatusLabel(PurchaseRequestStatus.Submitted),
      }),
    );
  }

  if (row.reviewedAt) {
    events.push(
      event({
        id: `${row.id}-reviewed`,
        action: 'reviewed',
        actionLabel: 'Marked reviewed',
        at: row.reviewedAt,
        actorId: row.reviewedBy,
        to: purchaseRequestStatusLabel(PurchaseRequestStatus.Reviewed),
        comment: row.reviewNotes,
      }),
    );
  }

  if (row.approvedAt && row.status !== PurchaseRequestStatus.Rejected) {
    events.push(
      event({
        id: `${row.id}-approved`,
        action: row.isPartiallyApproved ? 'partially_approved' : 'approved',
        actionLabel: row.isPartiallyApproved
          ? 'Partially approved'
          : 'Approved',
        at: row.approvedAt,
        actorId: row.approvedBy,
        to: purchaseRequestStatusLabel(PurchaseRequestStatus.Approved),
        comment: row.approvalNotes,
      }),
    );
  }

  if (
    row.status === PurchaseRequestStatus.Sourcing ||
    row.status === PurchaseRequestStatus.Closed
  ) {
    events.push(
      event({
        id: `${row.id}-sourcing`,
        action: 'start_sourcing',
        actionLabel: 'Moved to sourcing',
        at: row.updatedAt ?? row.approvedAt ?? null,
        to: purchaseRequestStatusLabel(PurchaseRequestStatus.Sourcing),
      }),
    );
  }

  if (row.status === PurchaseRequestStatus.Closed) {
    events.push(
      event({
        id: `${row.id}-closed`,
        action: 'closed',
        actionLabel: 'Closed',
        at: row.updatedAt ?? null,
        to: purchaseRequestStatusLabel(PurchaseRequestStatus.Closed),
      }),
    );
  }

  if (row.status === PurchaseRequestStatus.Returned) {
    events.push(
      event({
        id: `${row.id}-returned`,
        action: 'returned',
        actionLabel: 'Returned for correction',
        at: row.reviewedAt ?? row.updatedAt ?? null,
        actorId: row.reviewedBy,
        to: purchaseRequestStatusLabel(PurchaseRequestStatus.Returned),
        comment: row.reviewNotes,
      }),
    );
  }

  if (row.status === PurchaseRequestStatus.Rejected) {
    events.push(
      event({
        id: `${row.id}-rejected`,
        action: 'rejected',
        actionLabel: 'Rejected',
        at: row.approvedAt ?? row.updatedAt ?? null,
        actorId: row.approvedBy,
        to: purchaseRequestStatusLabel(PurchaseRequestStatus.Rejected),
        comment: row.rejectionReason,
      }),
    );
  }

  if (row.status === PurchaseRequestStatus.Cancelled) {
    events.push(
      event({
        id: `${row.id}-cancelled`,
        action: 'cancelled',
        actionLabel: 'Cancelled',
        at: row.updatedAt ?? row.createdAt ?? null,
        to: purchaseRequestStatusLabel(PurchaseRequestStatus.Cancelled),
      }),
    );
  }

  return events.sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : 0;
    const tb = b.at ? Date.parse(b.at) : 0;
    return ta - tb;
  });
}
