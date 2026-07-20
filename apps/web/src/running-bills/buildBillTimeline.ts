import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import { runningBillStatusLabel } from './labels';
import {
  ContractorBillStatus,
  type PublicContractorBill,
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
 * Client lifecycle timeline from bill workflow fields.
 * Nest has no dedicated timeline endpoint for contractor bills.
 */
export function buildBillTimeline(
  row: PublicContractorBill,
): WorkflowTimelineEvent[] {
  const events: WorkflowTimelineEvent[] = [];

  events.push(
    event({
      id: `${row.id}-created`,
      action: 'created',
      actionLabel: 'Bill created',
      at: row.createdAt ?? null,
      to: runningBillStatusLabel(ContractorBillStatus.Draft),
      comment: row.notes,
    }),
  );

  if (row.claimedAt) {
    events.push(
      event({
        id: `${row.id}-claimed`,
        action: 'submit-claim',
        actionLabel: 'Claim submitted',
        at: row.claimedAt,
        actorId: row.claimedBy,
        from: runningBillStatusLabel(ContractorBillStatus.Draft),
        to: runningBillStatusLabel(ContractorBillStatus.Claimed),
      }),
    );
  }

  if (row.engineerVerifiedAt) {
    events.push(
      event({
        id: `${row.id}-engineer-verified`,
        action: 'engineer-verify',
        actionLabel: 'Engineer verified',
        at: row.engineerVerifiedAt,
        actorId: row.engineerVerifiedBy,
        from: runningBillStatusLabel(ContractorBillStatus.Claimed),
        to: runningBillStatusLabel(ContractorBillStatus.EngineerVerified),
      }),
    );
  }

  if (row.pmCertifiedAt) {
    events.push(
      event({
        id: `${row.id}-pm-certified`,
        action: 'pm-certify',
        actionLabel: 'PM certified',
        at: row.pmCertifiedAt,
        actorId: row.pmCertifiedBy,
        from: runningBillStatusLabel(ContractorBillStatus.EngineerVerified),
        to: runningBillStatusLabel(ContractorBillStatus.PmCertified),
      }),
    );
  }

  if (row.financeVerifiedAt) {
    events.push(
      event({
        id: `${row.id}-finance-verified`,
        action: 'finance-verify',
        actionLabel: 'Finance verified',
        at: row.financeVerifiedAt,
        actorId: row.financeVerifiedBy,
        from: runningBillStatusLabel(ContractorBillStatus.PmCertified),
        to: runningBillStatusLabel(ContractorBillStatus.FinanceVerified),
      }),
    );
  }

  if (row.directorApprovedAt) {
    events.push(
      event({
        id: `${row.id}-director-approved`,
        action: 'director-approve',
        actionLabel: 'Director approved',
        at: row.directorApprovedAt,
        actorId: row.directorApprovedBy,
        from: runningBillStatusLabel(ContractorBillStatus.FinanceVerified),
        to: runningBillStatusLabel(ContractorBillStatus.DirectorApproved),
      }),
    );
  }

  if (row.postedAt) {
    events.push(
      event({
        id: `${row.id}-posted`,
        action: 'post',
        actionLabel: 'Posted',
        at: row.postedAt,
        actorId: row.postedBy,
        from: runningBillStatusLabel(ContractorBillStatus.DirectorApproved),
        to: runningBillStatusLabel(ContractorBillStatus.Posted),
      }),
    );
  }

  if (row.paidAt) {
    events.push(
      event({
        id: `${row.id}-paid`,
        action: 'mark-paid',
        actionLabel: 'Marked paid',
        at: row.paidAt,
        actorId: row.paidBy,
        from: runningBillStatusLabel(ContractorBillStatus.Posted),
        to: runningBillStatusLabel(ContractorBillStatus.Paid),
      }),
    );
  }

  if (row.rejectedAt) {
    events.push(
      event({
        id: `${row.id}-rejected`,
        action: 'reject',
        actionLabel: 'Rejected',
        at: row.rejectedAt,
        actorId: row.rejectedBy,
        to: runningBillStatusLabel(ContractorBillStatus.Rejected),
        comment: row.rejectionReason,
      }),
    );
  }

  return events;
}
