/**
 * Approval timeline actions — source:
 * `apps/backend/src/modules/approvals/schemas/approval-history.schema.ts`
 */
export const ApprovalHistoryAction = {
  Submitted: 'submitted',
  Approved: 'approved',
  Rejected: 'rejected',
  Returned: 'returned',
  Cancelled: 'cancelled',
  Escalated: 'escalated',
} as const;

export type ApprovalHistoryAction =
  (typeof ApprovalHistoryAction)[keyof typeof ApprovalHistoryAction];

export const APPROVAL_HISTORY_ACTIONS = Object.values(
  ApprovalHistoryAction,
) as ApprovalHistoryAction[];

/**
 * Audit log actions — source:
 * `apps/backend/src/modules/audit-log/schemas/audit-log.schema.ts`
 */
export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  POST: 'POST',
  REVERSE: 'REVERSE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  DOWNLOAD: 'DOWNLOAD',
  EXPORT: 'EXPORT',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const AUDIT_ACTIONS = Object.values(AuditAction) as AuditAction[];

const APPROVAL_ACTION_LABELS: Record<ApprovalHistoryAction, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned',
  cancelled: 'Cancelled',
  escalated: 'Escalated',
};

const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  APPROVE: 'Approved',
  REJECT: 'Rejected',
  POST: 'Posted',
  REVERSE: 'Reversed',
  LOGIN: 'Logged in',
  LOGOUT: 'Logged out',
  DOWNLOAD: 'Downloaded',
  EXPORT: 'Exported',
};

/**
 * Human label for a known approval/audit action. Unknown/legacy → title-cased raw
 * value, or "Event" when empty.
 */
export function labelTimelineAction(action: string | null | undefined): string {
  if (!action || !action.trim()) {
    return 'Event';
  }
  const trimmed = action.trim();
  if (trimmed in APPROVAL_ACTION_LABELS) {
    return APPROVAL_ACTION_LABELS[trimmed as ApprovalHistoryAction];
  }
  if (trimmed in AUDIT_ACTION_LABELS) {
    return AUDIT_ACTION_LABELS[trimmed as AuditAction];
  }
  // Legacy / free-form: keep readable without inventing new catalog values
  return trimmed
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Implied approval status after a timeline action (for transition display).
 * Uses only `ApprovalStatus` values from the approvals schema.
 */
export function impliedApprovalStatusAfterAction(
  action: string | null | undefined,
): string | null {
  switch (action) {
    case ApprovalHistoryAction.Submitted:
    case ApprovalHistoryAction.Escalated:
      return 'pending';
    case ApprovalHistoryAction.Approved:
      return 'approved';
    case ApprovalHistoryAction.Rejected:
      return 'rejected';
    case ApprovalHistoryAction.Returned:
      return 'returned';
    case ApprovalHistoryAction.Cancelled:
      return 'cancelled';
    default:
      return null;
  }
}

export function isApprovalHistoryAction(
  value: string,
): value is ApprovalHistoryAction {
  return (APPROVAL_HISTORY_ACTIONS as readonly string[]).includes(value);
}

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}
