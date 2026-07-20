import { ApprovalStatus } from '@luxaria/shared-types';
import {
  clampListLimit,
  clampListPage,
} from '@/components/data-table/listQuery';
import type { ApprovalAgeingLevel } from './ageing';
import type { ListApprovalsQuery } from './types';

/** Exact statuses from `ApprovalStatus` / Nest schema — do not invent. */
export const APPROVAL_STATUS_FILTERS = [
  ApprovalStatus.Pending,
  ApprovalStatus.Draft,
  ApprovalStatus.Returned,
  ApprovalStatus.Approved,
  ApprovalStatus.Rejected,
  ApprovalStatus.Cancelled,
] as const;

export type ApprovalStatusFilter = (typeof APPROVAL_STATUS_FILTERS)[number];

/** Client-only ageing buckets (backend has no ageing query param). */
export const APPROVAL_AGEING_FILTERS = [
  'fresh',
  'aging',
  'stale',
  'escalated',
] as const satisfies readonly ApprovalAgeingLevel[];

export type ApprovalInboxFilterState = {
  status: string;
  module: string;
  entityType: string;
  /** Client-side amount floor (inclusive). */
  minAmount: string;
  /** Client-side amount ceiling (inclusive). */
  maxAmount: string;
  /** Client-side ageing level. */
  ageing: string;
  /** Project ObjectId — drives which list API is called. */
  projectId: string;
};

export type ValidatedApprovalListQuery = {
  api: ListApprovalsQuery & { page: number; limit: number };
  client: {
    minAmount: number | null;
    maxAmount: number | null;
    ageing: ApprovalAgeingLevel | null;
  };
  fieldErrors: Partial<Record<keyof ApprovalInboxFilterState, string>>;
};

const STATUS_SET = new Set<string>(APPROVAL_STATUS_FILTERS);
const AGEING_SET = new Set<string>(APPROVAL_AGEING_FILTERS);
const MODULE_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const ENTITY_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function parseOptionalAmount(
  raw: string,
  field: 'minAmount' | 'maxAmount',
  errors: Partial<Record<keyof ApprovalInboxFilterState, string>>,
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) {
    errors[field] = 'Must be a non-negative number';
    return null;
  }
  return n;
}

/**
 * Validate inbox filters against Nest list query + client-only amount/ageing.
 * Unsupported status / ageing values are dropped (not sent / not applied).
 */
export function validateApprovalInboxFilters(input: {
  filters: ApprovalInboxFilterState;
  page: number;
  limit: number;
}): ValidatedApprovalListQuery {
  const fieldErrors: Partial<
    Record<keyof ApprovalInboxFilterState, string>
  > = {};
  const { filters } = input;

  let status: string | undefined;
  if (filters.status.trim()) {
    const s = filters.status.trim().toLowerCase();
    if (!STATUS_SET.has(s)) {
      fieldErrors.status = `Unsupported status “${filters.status}”`;
    } else {
      status = s;
    }
  }

  let module: string | undefined;
  if (filters.module.trim()) {
    const m = filters.module.trim().toLowerCase();
    if (!MODULE_RE.test(m)) {
      fieldErrors.module = 'Module must be a lowercase slug';
    } else {
      module = m;
    }
  }

  let entityType: string | undefined;
  if (filters.entityType.trim()) {
    const e = filters.entityType.trim().toLowerCase();
    if (!ENTITY_RE.test(e)) {
      fieldErrors.entityType = 'Entity type must be a lowercase slug';
    } else {
      entityType = e;
    }
  }

  if (filters.projectId.trim() && !OBJECT_ID_RE.test(filters.projectId.trim())) {
    fieldErrors.projectId = 'Project id must be a 24-character ObjectId';
  }

  const minAmount = parseOptionalAmount(
    filters.minAmount,
    'minAmount',
    fieldErrors,
  );
  const maxAmount = parseOptionalAmount(
    filters.maxAmount,
    'maxAmount',
    fieldErrors,
  );
  if (
    minAmount != null &&
    maxAmount != null &&
    minAmount > maxAmount &&
    !fieldErrors.minAmount &&
    !fieldErrors.maxAmount
  ) {
    fieldErrors.maxAmount = 'Max amount must be ≥ min amount';
  }

  let ageing: ApprovalAgeingLevel | null = null;
  if (filters.ageing.trim()) {
    const a = filters.ageing.trim().toLowerCase();
    if (!AGEING_SET.has(a)) {
      fieldErrors.ageing = `Unsupported ageing “${filters.ageing}”`;
    } else {
      ageing = a as ApprovalAgeingLevel;
    }
  }

  const page = clampListPage(input.page);
  const limit = clampListLimit(input.limit);

  return {
    api: {
      page,
      limit,
      status,
      module,
      entityType,
    },
    client: {
      minAmount: fieldErrors.minAmount ? null : minAmount,
      maxAmount: fieldErrors.maxAmount ? null : maxAmount,
      ageing: fieldErrors.ageing ? null : ageing,
    },
    fieldErrors,
  };
}

export function defaultApprovalInboxFilters(
  projectId = '',
): ApprovalInboxFilterState {
  return {
    status: ApprovalStatus.Pending,
    module: '',
    entityType: '',
    minAmount: '',
    maxAmount: '',
    ageing: '',
    projectId,
  };
}

/** Keys persisted in table preferences (localStorage). */
export const APPROVAL_SAVED_FILTER_KEYS = [
  'status',
  'module',
  'entityType',
  'minAmount',
  'maxAmount',
  'ageing',
] as const;
