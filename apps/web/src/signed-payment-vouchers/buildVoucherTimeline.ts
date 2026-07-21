import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import { signedPaymentVoucherStatusLabel } from './labels';
import { SignedPaymentVoucherStatus, type PublicSignedPaymentVoucher } from './types';

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

export function buildVoucherTimeline(
  row: PublicSignedPaymentVoucher,
): WorkflowTimelineEvent[] {
  const events: WorkflowTimelineEvent[] = [];

  events.push(
    event({
      id: `${row.id}-created`,
      action: 'created',
      actionLabel: 'Voucher created',
      at: row.createdAt ?? row.capturedAt,
      to: signedPaymentVoucherStatusLabel(SignedPaymentVoucherStatus.Draft),
      comment: row.workDescription,
    }),
  );

  if (row.submittedAt) {
    events.push(
      event({
        id: `${row.id}-submitted`,
        action: 'submitted',
        actionLabel: 'Submitted for approval',
        at: row.submittedAt,
        actorId: row.submittedBy,
        from: signedPaymentVoucherStatusLabel(SignedPaymentVoucherStatus.Draft),
        to: signedPaymentVoucherStatusLabel(SignedPaymentVoucherStatus.Submitted),
      }),
    );
  }

  if (row.approvedAt) {
    events.push(
      event({
        id: `${row.id}-approved`,
        action: 'approved',
        actionLabel: 'Approved — PDF generated',
        at: row.approvedAt,
        actorId: row.approvedBy,
        from: signedPaymentVoucherStatusLabel(
          SignedPaymentVoucherStatus.Submitted,
        ),
        to: signedPaymentVoucherStatusLabel(SignedPaymentVoucherStatus.Approved),
      }),
    );
  }

  if (row.postedAt) {
    events.push(
      event({
        id: `${row.id}-posted`,
        action: 'posted',
        actionLabel: 'Posted to accounting',
        at: row.postedAt,
        actorId: row.postedBy,
        from: signedPaymentVoucherStatusLabel(SignedPaymentVoucherStatus.Approved),
        to: signedPaymentVoucherStatusLabel(SignedPaymentVoucherStatus.Posted),
      }),
    );
  }

  if (row.reversedAt) {
    events.push(
      event({
        id: `${row.id}-reversed`,
        action: 'reversed',
        actionLabel: 'Reversed',
        at: row.reversedAt,
        actorId: row.reversedBy,
        comment: row.reversalReason,
        from: signedPaymentVoucherStatusLabel(SignedPaymentVoucherStatus.Posted),
        to: signedPaymentVoucherStatusLabel(SignedPaymentVoucherStatus.Reversed),
      }),
    );
  }

  if (row.cancelledAt) {
    events.push(
      event({
        id: `${row.id}-cancelled`,
        action: 'cancelled',
        actionLabel: 'Cancelled',
        at: row.cancelledAt,
        actorId: row.cancelledBy,
        comment: row.cancellationReason,
        to: signedPaymentVoucherStatusLabel(SignedPaymentVoucherStatus.Cancelled),
      }),
    );
  }

  return events.filter((e) => e.at);
}
