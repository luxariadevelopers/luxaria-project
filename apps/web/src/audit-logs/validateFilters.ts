import {
  AUDIT_ACTIONS,
  type AuditAction,
} from '@luxaria/shared-types';
import {
  clampListLimit,
  clampListPage,
} from '@/components/data-table/listQuery';
import type { ListAuditLogsQuery } from '@/api/audit-logs';

export type AuditLogFilterState = {
  userId: string;
  module: string;
  projectId: string;
  action: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
};

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const ACTION_SET = new Set<string>(AUDIT_ACTIONS);

export type ValidatedAuditLogQuery = {
  api: ListAuditLogsQuery;
  fieldErrors: Partial<Record<keyof AuditLogFilterState, string>>;
};

/**
 * Validate administration audit filters against Nest `QueryAuditLogDto`.
 */
export function validateAuditLogFilters(input: {
  filters: AuditLogFilterState;
  page: number;
  limit: number;
}): ValidatedAuditLogQuery {
  const fieldErrors: Partial<Record<keyof AuditLogFilterState, string>> = {};
  const { filters } = input;
  const api: ListAuditLogsQuery = {
    page: clampListPage(input.page),
    limit: clampListLimit(input.limit),
    sortBy: 'timestamp',
    sortOrder: 'desc',
  };

  if (filters.userId.trim()) {
    if (!OBJECT_ID_RE.test(filters.userId.trim())) {
      fieldErrors.userId = 'Actor id must be a 24-character ObjectId';
    } else {
      api.userId = filters.userId.trim();
    }
  }

  if (filters.module.trim()) {
    const m = filters.module.trim().toLowerCase();
    if (!SLUG_RE.test(m)) {
      fieldErrors.module = 'Module must be a lowercase slug';
    } else {
      api.module = m;
    }
  }

  if (filters.projectId.trim()) {
    if (!OBJECT_ID_RE.test(filters.projectId.trim())) {
      fieldErrors.projectId = 'Project id must be a 24-character ObjectId';
    } else {
      api.projectId = filters.projectId.trim();
    }
  }

  if (filters.action.trim()) {
    const a = filters.action.trim().toUpperCase();
    if (!ACTION_SET.has(a)) {
      fieldErrors.action = `Unsupported action “${filters.action}”`;
    } else {
      api.action = a as AuditAction;
    }
  }

  if (filters.entityType.trim()) {
    const e = filters.entityType.trim().toLowerCase();
    if (!SLUG_RE.test(e)) {
      fieldErrors.entityType = 'Entity type must be a lowercase slug';
    } else {
      api.entityType = e;
    }
  }

  if (filters.entityId.trim()) {
    api.entityId = filters.entityId.trim();
  }

  if (filters.from.trim()) {
    const d = Date.parse(filters.from.trim());
    if (Number.isNaN(d)) {
      fieldErrors.from = 'From must be a valid ISO date';
    } else {
      api.from = new Date(d).toISOString();
    }
  }

  if (filters.to.trim()) {
    const d = Date.parse(filters.to.trim());
    if (Number.isNaN(d)) {
      fieldErrors.to = 'To must be a valid ISO date';
    } else {
      api.to = new Date(d).toISOString();
    }
  }

  if (
    api.from &&
    api.to &&
    !fieldErrors.from &&
    !fieldErrors.to &&
    api.from > api.to
  ) {
    fieldErrors.to = 'To must be on or after From';
  }

  return { api, fieldErrors };
}

export function defaultAuditLogFilters(
  projectId = '',
): AuditLogFilterState {
  return {
    userId: '',
    module: '',
    projectId,
    action: '',
    entityType: '',
    entityId: '',
    from: '',
    to: '',
  };
}
