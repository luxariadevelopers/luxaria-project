import {
  impliedApprovalStatusAfterAction,
  isApprovalHistoryAction,
  isAuditAction,
  labelTimelineAction,
} from './actions';
import type {
  LegacyTimelineEventInput,
  NormalizeTimelineOptions,
  PublicApprovalHistorySnapshot,
  PublicApprovalTimelineEntry,
  PublicAuditLogEntry,
  WorkflowTimelineActor,
  WorkflowTimelineDocumentRef,
  WorkflowTimelineEvent,
  WorkflowTimelineStatusTransition,
} from './types';

const DEFAULT_MISSING_ACTOR = 'Unknown actor';

function toIsoOrNull(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  obj: Record<string, unknown>,
  key: string,
): string | null {
  const v = obj[key];
  if (typeof v === 'string' && v.trim()) {
    return v.trim();
  }
  return null;
}

function resolveActor(
  actorId: string | null | undefined,
  actorName: string | null | undefined,
  options: NormalizeTimelineOptions,
): WorkflowTimelineActor {
  const missing = options.missingActorLabel ?? DEFAULT_MISSING_ACTOR;
  const id =
    typeof actorId === 'string' && actorId.trim() ? actorId.trim() : null;
  if (actorName && actorName.trim()) {
    return { id, displayName: actorName.trim() };
  }
  if (id && options.actorDirectory?.[id]) {
    return { id, displayName: options.actorDirectory[id] };
  }
  if (id) {
    return { id, displayName: id };
  }
  return { id: null, displayName: missing };
}

function extractDocumentRefs(
  metadata: Record<string, unknown> | null | undefined,
  explicit?: LegacyTimelineEventInput['documents'],
  documentIds?: readonly string[] | null,
): WorkflowTimelineDocumentRef[] {
  const out: WorkflowTimelineDocumentRef[] = [];
  const seen = new Set<string>();

  const push = (id: string, label: string | null) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ id, label });
  };

  if (explicit) {
    for (const doc of explicit) {
      const id = doc?.id?.trim();
      if (!id) continue;
      push(id, doc.label?.trim() || doc.fileName?.trim() || null);
    }
  }

  if (documentIds) {
    for (const id of documentIds) {
      if (typeof id === 'string' && id.trim()) {
        push(id.trim(), null);
      }
    }
  }

  if (metadata) {
    const ids = metadata.documentIds ?? metadata.documentId;
    if (Array.isArray(ids)) {
      for (const id of ids) {
        if (typeof id === 'string' && id.trim()) {
          push(id.trim(), null);
        }
      }
    } else if (typeof ids === 'string' && ids.trim()) {
      push(ids.trim(), null);
    }

    const docs = metadata.documents;
    if (Array.isArray(docs)) {
      for (const raw of docs) {
        if (!isPlainObject(raw)) continue;
        const id = readString(raw, 'id') ?? readString(raw, 'documentId');
        if (!id) continue;
        push(
          id,
          readString(raw, 'label') ??
            readString(raw, 'fileName') ??
            readString(raw, 'originalFileName'),
        );
      }
    }
  }

  return out;
}

function statusTransitionFromData(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): WorkflowTimelineStatusTransition | null {
  const from = before ? readString(before, 'status') : null;
  const to = after ? readString(after, 'status') : null;
  if (!from && !to) {
    return null;
  }
  if (from === to) {
    return null;
  }
  return { from, to };
}

function statusFromMetadata(
  metadata: Record<string, unknown> | null,
  action: string,
): WorkflowTimelineStatusTransition | null {
  if (!metadata) {
    const implied = impliedApprovalStatusAfterAction(action);
    return implied ? { from: null, to: implied } : null;
  }

  const from =
    readString(metadata, 'fromStatus') ??
    readString(metadata, 'previousStatus') ??
    readString(metadata, 'from');
  const to =
    readString(metadata, 'toStatus') ??
    readString(metadata, 'status') ??
    readString(metadata, 'to');

  if (from || to) {
    return { from, to };
  }

  const implied = impliedApprovalStatusAfterAction(action);
  return implied ? { from: null, to: implied } : null;
}

function eventKindForAction(
  action: string,
  source: WorkflowTimelineEvent['source'],
): WorkflowTimelineEvent['kind'] {
  if (source === 'approval_timeline' || source === 'approval_history') {
    return isApprovalHistoryAction(action) ? 'approval' : 'legacy';
  }
  if (source === 'audit_log') {
    return isAuditAction(action) ? 'audit' : 'legacy';
  }
  if (isApprovalHistoryAction(action)) return 'approval';
  if (isAuditAction(action)) return 'audit';
  if (action) return 'legacy';
  return 'unknown';
}

/**
 * Sort ascending by time (oldest first). Null timestamps sort last.
 * Stable secondary key: id.
 */
export function sortTimelineEvents(
  events: readonly WorkflowTimelineEvent[],
): WorkflowTimelineEvent[] {
  return [...events].sort((a, b) => {
    if (a.at === null && b.at === null) {
      return a.id.localeCompare(b.id);
    }
    if (a.at === null) return 1;
    if (b.at === null) return -1;
    const cmp = a.at.localeCompare(b.at);
    return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
  });
}

export function normalizeApprovalTimelineEntries(
  entries: readonly PublicApprovalTimelineEntry[],
  options: NormalizeTimelineOptions = {},
): WorkflowTimelineEvent[] {
  const events = entries.map((entry, index) => {
    const action = typeof entry.action === 'string' ? entry.action : '';
    const metadata = isPlainObject(entry.metadata) ? entry.metadata : null;
    return {
      id: entry.id || `approval-timeline-${index}`,
      kind: eventKindForAction(action, 'approval_timeline'),
      source: 'approval_timeline' as const,
      action,
      actionLabel: labelTimelineAction(action),
      at: toIsoOrNull(entry.at),
      actor: resolveActor(entry.actorId, null, options),
      comment: entry.comment ?? null,
      documents: extractDocumentRefs(metadata),
      statusTransition: statusFromMetadata(metadata, action),
      stepNumber:
        typeof entry.stepNumber === 'number' ? entry.stepNumber : null,
      metadata,
    };
  });
  return sortTimelineEvents(events);
}

export function normalizeApprovalHistorySnapshots(
  snapshots: readonly PublicApprovalHistorySnapshot[],
  options: NormalizeTimelineOptions = {},
): WorkflowTimelineEvent[] {
  const events = snapshots.map((row, index) => {
    const action = typeof row.action === 'string' ? row.action : '';
    return {
      id: row.historyId || `approval-history-${index}`,
      kind: eventKindForAction(action, 'approval_history'),
      source: 'approval_history' as const,
      action,
      actionLabel: labelTimelineAction(action),
      at: toIsoOrNull(row.at),
      actor: resolveActor(row.actorId, null, options),
      comment: row.comment ?? null,
      documents: [],
      statusTransition: statusFromMetadata(null, action),
      stepNumber: typeof row.stepNumber === 'number' ? row.stepNumber : null,
      metadata: null,
    };
  });
  return sortTimelineEvents(events);
}

export function normalizeAuditLogEntries(
  entries: readonly PublicAuditLogEntry[],
  options: NormalizeTimelineOptions = {},
): WorkflowTimelineEvent[] {
  const events = entries.map((entry, index) => {
    const action = typeof entry.action === 'string' ? entry.action : '';
    const before = isPlainObject(entry.beforeData) ? entry.beforeData : null;
    const after = isPlainObject(entry.afterData) ? entry.afterData : null;
    const metadata: Record<string, unknown> = {
      module: entry.module,
      entityType: entry.entityType,
      entityId: entry.entityId,
      projectId: entry.projectId,
    };
    if (entry.requestId) metadata.requestId = entry.requestId;

    const transition = statusTransitionFromData(before, after);
    const comment =
      (after ? readString(after, 'comment') : null) ??
      (after ? readString(after, 'reason') : null) ??
      (after ? readString(after, 'notes') : null);

    const docsFromAfter = extractDocumentRefs(after);
    const documents =
      docsFromAfter.length > 0 ? docsFromAfter : extractDocumentRefs(before);

    return {
      id: entry.id || `audit-${index}`,
      kind: eventKindForAction(action, 'audit_log'),
      source: 'audit_log' as const,
      action,
      actionLabel: labelTimelineAction(action),
      at: toIsoOrNull(entry.timestamp),
      actor: resolveActor(entry.userId, null, options),
      comment,
      documents,
      statusTransition: transition,
      stepNumber: null,
      metadata,
    };
  });
  return sortTimelineEvents(events);
}

/**
 * Normalise loose / legacy payloads (older clients, embedded history blobs).
 * Missing actor, timestamp, and unknown actions are tolerated.
 */
export function normalizeLegacyTimelineEvents(
  inputs: readonly LegacyTimelineEventInput[],
  options: NormalizeTimelineOptions = {},
): WorkflowTimelineEvent[] {
  const events = inputs.map((raw, index) => {
    const action = typeof raw.action === 'string' ? raw.action.trim() : '';
    const metadata = isPlainObject(raw.metadata) ? raw.metadata : null;
    const from =
      raw.fromStatus?.trim() ||
      raw.previousStatus?.trim() ||
      null;
    const to = raw.toStatus?.trim() || raw.status?.trim() || null;
    const statusTransition: WorkflowTimelineStatusTransition | null =
      from || to ? { from, to } : statusFromMetadata(metadata, action);

    return {
      id: raw.id?.trim() || `legacy-${index}`,
      kind: eventKindForAction(action, 'provided'),
      source: 'provided' as const,
      action,
      actionLabel: labelTimelineAction(action),
      at: toIsoOrNull(raw.at ?? raw.timestamp),
      actor: resolveActor(raw.actorId, raw.actorName, options),
      comment: raw.comment?.trim() || raw.notes?.trim() || null,
      documents: extractDocumentRefs(metadata, raw.documents, raw.documentIds),
      statusTransition,
      stepNumber: typeof raw.stepNumber === 'number' ? raw.stepNumber : null,
      metadata,
    };
  });
  return sortTimelineEvents(events);
}

/** Merge multiple normalised sources and sort chronologically. */
export function mergeTimelineEvents(
  ...groups: readonly (readonly WorkflowTimelineEvent[])[]
): WorkflowTimelineEvent[] {
  const seen = new Set<string>();
  const merged: WorkflowTimelineEvent[] = [];
  for (const group of groups) {
    for (const event of group) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      merged.push(event);
    }
  }
  return sortTimelineEvents(merged);
}
