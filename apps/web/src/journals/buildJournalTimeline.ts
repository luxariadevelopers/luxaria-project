import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import { journalStatusLabel } from './labels';
import type { PublicJournalEntry } from './types';
import { JournalStatus } from './types';

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
 * Client lifecycle timeline from journal fields.
 * There is no dedicated journal timeline Nest API; optional audit merge is separate.
 */
export function buildJournalTimeline(
  journal: PublicJournalEntry,
): WorkflowTimelineEvent[] {
  const events: WorkflowTimelineEvent[] = [];

  events.push(
    event({
      id: `${journal.id}-created`,
      action: 'created',
      actionLabel: 'Journal created',
      at: journal.createdAt ?? journal.journalDate,
      to: journalStatusLabel(JournalStatus.Draft),
      comment: journal.narration,
    }),
  );

  if (journal.status === JournalStatus.PendingApproval) {
    events.push(
      event({
        id: `${journal.id}-submitted`,
        action: 'submitted',
        actionLabel: 'Submitted for approval',
        at: journal.updatedAt ?? journal.createdAt ?? null,
        from: journalStatusLabel(JournalStatus.Draft),
        to: journalStatusLabel(JournalStatus.PendingApproval),
      }),
    );
  }

  if (journal.postedAt) {
    events.push(
      event({
        id: `${journal.id}-posted`,
        action: 'posted',
        actionLabel: 'Posted (immutable)',
        at: journal.postedAt,
        actorId: journal.postedBy,
        from:
          journal.status === JournalStatus.Reversed
            ? journalStatusLabel(JournalStatus.Posted)
            : undefined,
        to: journalStatusLabel(JournalStatus.Posted),
      }),
    );
  }

  if (journal.status === JournalStatus.Reversed) {
    events.push(
      event({
        id: `${journal.id}-reversed`,
        action: 'reversed',
        actionLabel: 'Reversed',
        at: journal.updatedAt ?? journal.postedAt,
        to: journalStatusLabel(JournalStatus.Reversed),
        comment: journal.reversedBy
          ? `Reversing entry id: ${journal.reversedBy}`
          : null,
      }),
    );
  }

  if (journal.status === JournalStatus.Cancelled) {
    events.push(
      event({
        id: `${journal.id}-cancelled`,
        action: 'cancelled',
        actionLabel: 'Cancelled',
        at: journal.updatedAt ?? journal.createdAt ?? null,
        to: journalStatusLabel(JournalStatus.Cancelled),
      }),
    );
  }

  if (journal.reversalOf) {
    events.push(
      event({
        id: `${journal.id}-reversal-of`,
        action: 'reversal_entry',
        actionLabel: 'Reversing entry',
        at: journal.postedAt ?? journal.createdAt ?? null,
        comment: `Reversal of journal ${journal.reversalOf}`,
      }),
    );
  }

  return events.sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : 0;
    const tb = b.at ? Date.parse(b.at) : 0;
    return ta - tb;
  });
}
