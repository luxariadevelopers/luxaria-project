import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import { purchaseOrderStatusLabel } from './labels';
import type { PublicPurchaseOrder } from './types';

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
 * Client timeline from PO fields + revision chain.
 * Nest has no dedicated PO timeline endpoint.
 */
export function buildPurchaseOrderTimeline(
  po: PublicPurchaseOrder,
  chain: readonly PublicPurchaseOrder[] = [],
): WorkflowTimelineEvent[] {
  const events: WorkflowTimelineEvent[] = [];

  for (const rev of chain) {
    const createdAt = rev.createdAt ?? rev.orderDate;
    events.push(
      event({
        id: `${rev.id}-created`,
        action: 'revision_created',
        actionLabel:
          rev.revisionNumber > 1
            ? `Revision r${rev.revisionNumber} created (${rev.purchaseOrderNumber})`
            : `Purchase order created (${rev.purchaseOrderNumber})`,
        at: createdAt,
        to: purchaseOrderStatusLabel(rev.status),
        comment:
          rev.revisedFromId != null
            ? `Supersedes previous revision`
            : null,
      }),
    );

    if (rev.issuedAt) {
      events.push(
        event({
          id: `${rev.id}-issued`,
          action: 'issued',
          actionLabel: `Issued r${rev.revisionNumber}`,
          at: rev.issuedAt,
          actorId: rev.issuedBy,
          from: 'Pending Approval',
          to: 'Issued',
        }),
      );
    }

    if (rev.status === 'superseded') {
      events.push(
        event({
          id: `${rev.id}-superseded`,
          action: 'superseded',
          actionLabel: `Superseded r${rev.revisionNumber}`,
          at: rev.updatedAt ?? rev.createdAt ?? null,
          from: 'Issued',
          to: 'Superseded',
        }),
      );
    }
  }

  if (chain.length === 0) {
    events.push(
      event({
        id: `${po.id}-created`,
        action: 'created',
        actionLabel: `Purchase order created (${po.purchaseOrderNumber})`,
        at: po.createdAt ?? po.orderDate,
        to: purchaseOrderStatusLabel(po.status),
      }),
    );
    if (po.issuedAt) {
      events.push(
        event({
          id: `${po.id}-issued`,
          action: 'issued',
          actionLabel: 'Issued',
          at: po.issuedAt,
          actorId: po.issuedBy,
          from: 'Pending Approval',
          to: 'Issued',
        }),
      );
    }
  }

  const receivedAny = po.items.some((i) => i.receivedQuantity > 0);
  if (receivedAny) {
    events.push(
      event({
        id: `${po.id}-receipts`,
        action: 'receipt_progress',
        actionLabel: `Receipts recorded (${purchaseOrderStatusLabel(po.status)})`,
        at: po.updatedAt ?? null,
        to: purchaseOrderStatusLabel(po.status),
      }),
    );
  }

  return events.sort((a, b) => {
    const atA = a.at ? Date.parse(a.at) : 0;
    const atB = b.at ? Date.parse(b.at) : 0;
    return atA - atB;
  });
}
