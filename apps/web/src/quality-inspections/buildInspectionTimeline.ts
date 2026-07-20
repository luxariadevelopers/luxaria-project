import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import {
  qualityInspectionResultLabel,
  qualityInspectionStatusLabel,
} from './labels';
import type { PublicQualityInspection } from './types';

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

/** Client timeline from inspection fields (no dedicated Nest timeline API). */
export function buildInspectionTimeline(
  inspection: PublicQualityInspection,
): WorkflowTimelineEvent[] {
  const events: WorkflowTimelineEvent[] = [];
  const createdAt = inspection.createdAt ?? inspection.inspectionDate;

  events.push(
    event({
      id: `${inspection.id}-created`,
      action: 'created',
      actionLabel: 'Inspection created',
      at: createdAt,
      actorId: inspection.inspector,
      to: qualityInspectionStatusLabel(inspection.status),
    }),
  );

  if (
    inspection.status === 'in_progress' ||
    inspection.status === 'completed' ||
    inspection.updatedAt
  ) {
    events.push(
      event({
        id: `${inspection.id}-progress`,
        action: 'updated',
        actionLabel: 'Inspection updated',
        at: inspection.updatedAt ?? createdAt,
        from: 'Draft',
        to: qualityInspectionStatusLabel(
          inspection.status === 'draft' ? 'in_progress' : inspection.status,
        ),
      }),
    );
  }

  if (inspection.completedAt) {
    events.push(
      event({
        id: `${inspection.id}-completed`,
        action: 'completed',
        actionLabel: `Result: ${qualityInspectionResultLabel(inspection.result)}`,
        at: inspection.completedAt,
        actorId: inspection.completedBy,
        from: qualityInspectionStatusLabel('in_progress'),
        to: qualityInspectionStatusLabel('completed'),
        comment: inspection.remarks,
      }),
    );
  }

  if (inspection.status === 'cancelled') {
    events.push(
      event({
        id: `${inspection.id}-cancelled`,
        action: 'cancelled',
        actionLabel: 'Inspection cancelled',
        at: inspection.updatedAt ?? createdAt,
        to: qualityInspectionStatusLabel('cancelled'),
      }),
    );
  }

  return events.sort((a, b) => {
    const atA = a.at ? new Date(a.at).getTime() : 0;
    const atB = b.at ? new Date(b.at).getTime() : 0;
    return atA - atB;
  });
}
