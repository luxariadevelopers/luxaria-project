import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import { pettyCashRequestStatusLabel } from './labels';
import {
  PettyCashRequirementStatus,
  type PublicPettyCashRequirement,
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
 * Client lifecycle timeline from requirement fields.
 * There is no dedicated Nest timeline endpoint for petty-cash requirements.
 */
export function buildPettyCashRequestTimeline(
  row: PublicPettyCashRequirement,
): WorkflowTimelineEvent[] {
  const events: WorkflowTimelineEvent[] = [];

  events.push(
    event({
      id: `${row.id}-created`,
      action: 'created',
      actionLabel: 'Request created',
      at: row.createdAt ?? row.weekStartDate,
      actorId: row.requestedBy,
      to: pettyCashRequestStatusLabel(PettyCashRequirementStatus.Draft),
      comment: row.justification,
    }),
  );

  if (
    row.status !== PettyCashRequirementStatus.Draft &&
    row.status !== PettyCashRequirementStatus.Cancelled
  ) {
    events.push(
      event({
        id: `${row.id}-submitted`,
        action: 'submitted',
        actionLabel: 'Submitted for approval',
        at: row.updatedAt ?? row.createdAt ?? null,
        actorId: row.requestedBy,
        from: pettyCashRequestStatusLabel(PettyCashRequirementStatus.Draft),
        to: pettyCashRequestStatusLabel(PettyCashRequirementStatus.Submitted),
      }),
    );
  }

  if (row.projectManagerReviewedAt) {
    events.push(
      event({
        id: `${row.id}-pm`,
        action: 'pm_approved',
        actionLabel: 'Project manager approved',
        at: row.projectManagerReviewedAt,
        actorId: row.projectManagerReviewedBy,
        to: pettyCashRequestStatusLabel(
          PettyCashRequirementStatus.FinanceReview,
        ),
      }),
    );
  }

  if (row.financeReviewedAt) {
    events.push(
      event({
        id: `${row.id}-finance`,
        action: 'finance_approved',
        actionLabel: 'Finance approved',
        at: row.financeReviewedAt,
        actorId: row.financeReviewedBy,
        to: pettyCashRequestStatusLabel(PettyCashRequirementStatus.Approved),
        comment:
          row.approvedAmount != null
            ? `Approved amount: ${row.approvedAmount}`
            : null,
      }),
    );
  }

  if (row.fundedAt) {
    events.push(
      event({
        id: `${row.id}-funded`,
        action: 'funded',
        actionLabel: 'Funded',
        at: row.fundedAt,
        actorId: row.fundedBy,
        to: pettyCashRequestStatusLabel(PettyCashRequirementStatus.Funded),
        comment:
          row.fundedAmount != null ? `Funded amount: ${row.fundedAmount}` : null,
      }),
    );
  }

  if (row.closedAt) {
    events.push(
      event({
        id: `${row.id}-closed`,
        action: 'closed',
        actionLabel: 'Closed',
        at: row.closedAt,
        actorId: row.closedBy,
        to: pettyCashRequestStatusLabel(PettyCashRequirementStatus.Closed),
      }),
    );
  }

  if (row.status === PettyCashRequirementStatus.Returned) {
    events.push(
      event({
        id: `${row.id}-returned`,
        action: 'returned',
        actionLabel: 'Returned for correction',
        at: row.updatedAt ?? null,
        to: pettyCashRequestStatusLabel(PettyCashRequirementStatus.Returned),
        comment: row.rejectionReason,
      }),
    );
  }

  if (row.status === PettyCashRequirementStatus.Rejected) {
    events.push(
      event({
        id: `${row.id}-rejected`,
        action: 'rejected',
        actionLabel: 'Rejected',
        at: row.updatedAt ?? null,
        to: pettyCashRequestStatusLabel(PettyCashRequirementStatus.Rejected),
        comment: row.rejectionReason,
      }),
    );
  }

  if (row.status === PettyCashRequirementStatus.Cancelled) {
    events.push(
      event({
        id: `${row.id}-cancelled`,
        action: 'cancelled',
        actionLabel: 'Cancelled',
        at: row.updatedAt ?? row.createdAt ?? null,
        to: pettyCashRequestStatusLabel(PettyCashRequirementStatus.Cancelled),
      }),
    );
  }

  return events.sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : 0;
    const tb = b.at ? Date.parse(b.at) : 0;
    return ta - tb;
  });
}
