/**
 * Normalised workflow audit timeline event for web/mobile detail pages.
 * Adapters map approval timeline + audit-log entity history (and legacy
 * shapes) into this model — do not invent API fields beyond known payloads.
 */

export type WorkflowTimelineEventKind =
  | 'approval'
  | 'audit'
  | 'status'
  | 'legacy'
  | 'unknown';

export type WorkflowTimelineEventSource =
  | 'approval_timeline'
  | 'approval_history'
  | 'audit_log'
  | 'provided';

export type WorkflowTimelineActor = {
  /** User id when known; null for missing / system / legacy. */
  id: string | null;
  displayName: string;
};

export type WorkflowTimelineDocumentRef = {
  id: string;
  label: string | null;
};

export type WorkflowTimelineStatusTransition = {
  from: string | null;
  to: string | null;
};

export type WorkflowTimelineEvent = {
  id: string;
  kind: WorkflowTimelineEventKind;
  source: WorkflowTimelineEventSource;
  /** Raw action string from the API (never invent new enum values). */
  action: string;
  actionLabel: string;
  /** ISO timestamp when parseable; null for legacy missing times. */
  at: string | null;
  actor: WorkflowTimelineActor;
  comment: string | null;
  documents: WorkflowTimelineDocumentRef[];
  statusTransition: WorkflowTimelineStatusTransition | null;
  stepNumber: number | null;
  metadata: Record<string, unknown> | null;
};

/** Mirrors `PublicTimelineEntry` from approvals.mapper.ts */
export type PublicApprovalTimelineEntry = {
  id: string;
  approvalRequestId?: string;
  approvalCode?: string;
  stepNumber: number;
  action: string;
  actorId: string | null | undefined;
  comment: string | null;
  metadata: Record<string, unknown> | null;
  at: string | Date;
};

/** Mirrors embedded `PublicApprovalHistory` snapshot on approval requests */
export type PublicApprovalHistorySnapshot = {
  historyId: string;
  stepNumber: number;
  action: string;
  actorId: string | null | undefined;
  comment: string | null;
  at: string | Date;
};

/** Mirrors `PublicAuditLog` from audit-log.service.ts */
export type PublicAuditLogEntry = {
  id: string;
  userId: string | null;
  action: string;
  module: string;
  entityType: string;
  entityId: string | null;
  projectId: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  deviceId?: string | null;
  timestamp: string | Date;
};

/**
 * Loose legacy / pre-normalised event shape accepted by
 * `normalizeLegacyTimelineEvents`. Extra keys are ignored.
 */
export type LegacyTimelineEventInput = {
  id?: string | null;
  action?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  at?: string | Date | null;
  timestamp?: string | Date | null;
  comment?: string | null;
  notes?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  previousStatus?: string | null;
  status?: string | null;
  stepNumber?: number | null;
  documentIds?: readonly string[] | null;
  documents?: readonly {
    id?: string | null;
    label?: string | null;
    fileName?: string | null;
  }[] | null;
  metadata?: Record<string, unknown> | null;
};

export type NormalizeTimelineOptions = {
  /** Map user id → display name when the API only returns ids. */
  actorDirectory?: Readonly<Record<string, string>>;
  /** Fallback label when actor id/name is missing. */
  missingActorLabel?: string;
};

/** `GET .../approvals/:id/timeline` success `data` shape. */
export type ApprovalTimelinePayload = {
  approval: {
    id: string;
    approvalCode: string;
    status: string;
    approvalHistory?: PublicApprovalHistorySnapshot[];
    [key: string]: unknown;
  };
  timeline: PublicApprovalTimelineEntry[];
};
