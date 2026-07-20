import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import { expenseStatusLabel } from './labels';
import {
  SiteExpenseVoucherStatus,
  type PublicSiteExpenseVoucher,
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
 * Client lifecycle timeline from voucher fields.
 * Nest has no dedicated timeline endpoint for site expense vouchers.
 */
export function buildExpenseTimeline(
  row: PublicSiteExpenseVoucher,
): WorkflowTimelineEvent[] {
  const events: WorkflowTimelineEvent[] = [];

  events.push(
    event({
      id: `${row.id}-created`,
      action: 'created',
      actionLabel: 'Voucher created',
      at: row.createdAt ?? row.expenseDate,
      to: expenseStatusLabel(SiteExpenseVoucherStatus.Draft),
      comment: row.purpose,
    }),
  );

  if (row.submittedAt) {
    events.push(
      event({
        id: `${row.id}-submitted`,
        action: 'submitted',
        actionLabel: 'Submitted',
        at: row.submittedAt,
        actorId: row.submittedBy,
        from: expenseStatusLabel(SiteExpenseVoucherStatus.Draft),
        to: expenseStatusLabel(SiteExpenseVoucherStatus.Submitted),
      }),
    );
  }

  if (row.verifiedAt) {
    events.push(
      event({
        id: `${row.id}-verified`,
        action: 'verified',
        actionLabel: 'Verified',
        at: row.verifiedAt,
        actorId: row.verifiedBy,
        from: expenseStatusLabel(SiteExpenseVoucherStatus.Submitted),
        to: expenseStatusLabel(SiteExpenseVoucherStatus.Verified),
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
        from: expenseStatusLabel(SiteExpenseVoucherStatus.Verified),
        to: expenseStatusLabel(SiteExpenseVoucherStatus.Approved),
      }),
    );
  }

  if (row.postedAt) {
    events.push(
      event({
        id: `${row.id}-posted`,
        action: 'posted',
        actionLabel: 'Posted to ledger',
        at: row.postedAt,
        actorId: row.postedBy,
        from: expenseStatusLabel(SiteExpenseVoucherStatus.Approved),
        to: expenseStatusLabel(SiteExpenseVoucherStatus.Posted),
        comment: row.journalEntryId
          ? `Journal ${row.journalEntryId}`
          : null,
      }),
    );
  }

  if (row.status === SiteExpenseVoucherStatus.Rejected || row.rejectedAt) {
    events.push(
      event({
        id: `${row.id}-rejected`,
        action: 'rejected',
        actionLabel: 'Rejected',
        at: row.rejectedAt ?? row.updatedAt ?? null,
        actorId: row.rejectedBy,
        to: expenseStatusLabel(SiteExpenseVoucherStatus.Rejected),
        comment: row.rejectionReason,
      }),
    );
  }

  if (row.status === SiteExpenseVoucherStatus.Returned) {
    events.push(
      event({
        id: `${row.id}-returned`,
        action: 'returned',
        actionLabel: 'Returned for correction',
        at: row.updatedAt ?? null,
        to: expenseStatusLabel(SiteExpenseVoucherStatus.Returned),
        comment: row.rejectionReason,
      }),
    );
  }

  if (row.status === SiteExpenseVoucherStatus.Cancelled || row.cancelledAt) {
    events.push(
      event({
        id: `${row.id}-cancelled`,
        action: 'cancelled',
        actionLabel: 'Cancelled',
        at: row.cancelledAt ?? row.updatedAt ?? null,
        actorId: row.cancelledBy,
        to: expenseStatusLabel(SiteExpenseVoucherStatus.Cancelled),
        comment: row.cancellationReason,
      }),
    );
  }

  return events.sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : 0;
    const tb = b.at ? Date.parse(b.at) : 0;
    return ta - tb;
  });
}
