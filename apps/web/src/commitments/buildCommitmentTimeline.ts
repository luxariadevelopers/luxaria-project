import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import { commitmentStatusLabel } from './labels';
import type { PublicCommitment } from './types';

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
 * Builds a client timeline from commitment fields + version history.
 * There is no dedicated commitment timeline API.
 */
export function buildCommitmentTimeline(
  commitment: PublicCommitment,
  history: readonly PublicCommitment[] = [],
): WorkflowTimelineEvent[] {
  const events: WorkflowTimelineEvent[] = [];

  const createdAt = commitment.createdAt ?? commitment.commitmentDate;
  events.push(
    event({
      id: `${commitment.id}-created`,
      action: 'created',
      actionLabel: 'Commitment created',
      at: createdAt,
      to: commitmentStatusLabel(commitment.status),
    }),
  );

  if (commitment.submittedAt) {
    events.push(
      event({
        id: `${commitment.id}-submitted`,
        action: 'submitted',
        actionLabel: 'Submitted for approval',
        at: commitment.submittedAt,
        actorId: commitment.submittedBy,
        from: 'Draft',
        to: 'Submitted',
      }),
    );
  }

  if (commitment.approvedAt) {
    events.push(
      event({
        id: `${commitment.id}-approved`,
        action: 'approved',
        actionLabel: 'Approved',
        at: commitment.approvedAt,
        actorId: commitment.approvedBy,
        from: 'Submitted',
        to: 'Approved',
      }),
    );
  }

  if (commitment.cancelledAt) {
    events.push(
      event({
        id: `${commitment.id}-cancelled`,
        action: 'cancelled',
        actionLabel: 'Cancelled',
        at: commitment.cancelledAt,
        actorId: commitment.cancelledBy,
        comment: commitment.cancellationReason,
        to: 'Cancelled',
      }),
    );
  }

  for (const version of history) {
    if (version.id === commitment.id) continue;
    if (version.status === 'superseded') {
      events.push(
        event({
          id: `${version.id}-superseded`,
          action: 'superseded',
          actionLabel: `Version ${version.version} superseded`,
          at: version.updatedAt ?? version.approvedAt ?? null,
          from: 'Approved',
          to: 'Superseded',
          comment: `Replaced by a later amendment (v${commitment.version}).`,
        }),
      );
    }
  }

  for (const [index, receipt] of commitment.receipts.entries()) {
    events.push(
      event({
        id: `${commitment.id}-receipt-${index}`,
        action: 'receipt_recorded',
        actionLabel: 'Receipt recorded',
        at: receipt.receivedAt,
        actorId: receipt.recordedBy,
        comment: [
          receipt.reference ? `Ref: ${receipt.reference}` : null,
          receipt.remarks,
        ]
          .filter(Boolean)
          .join(' — ') || null,
      }),
    );
  }

  return events.sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : 0;
    const tb = b.at ? Date.parse(b.at) : 0;
    return ta - tb;
  });
}
