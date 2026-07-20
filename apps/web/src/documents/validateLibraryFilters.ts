import { DocumentStatus } from '@luxaria/shared-types';
import {
  clampListLimit,
  clampListPage,
} from '@/components/data-table/listQuery';
import type { ListDocumentsQuery } from '@luxaria/shared-types';

/** Exact statuses from Nest `DocumentStatus` — do not invent. */
export const DOCUMENT_STATUS_FILTERS = [
  DocumentStatus.PendingUpload,
  DocumentStatus.Active,
  DocumentStatus.Replaced,
  DocumentStatus.Archived,
] as const;

export type DocumentLibraryFilterState = {
  entityType: string;
  entityId: string;
  module: string;
  projectId: string;
  status: string;
  /** Client-side search over loaded rows (API has no search param). */
  search: string;
};

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const STATUS_SET = new Set<string>(DOCUMENT_STATUS_FILTERS);

export type ValidatedDocumentLibraryQuery = {
  ready: boolean;
  api: ListDocumentsQuery | null;
  fieldErrors: Partial<Record<keyof DocumentLibraryFilterState, string>>;
};

/**
 * Validate library filters against Nest `GET /documents` query.
 * `entityType` + `entityId` are required by the list API.
 */
export function validateDocumentLibraryFilters(input: {
  filters: DocumentLibraryFilterState;
  page: number;
  limit: number;
}): ValidatedDocumentLibraryQuery {
  const fieldErrors: Partial<
    Record<keyof DocumentLibraryFilterState, string>
  > = {};
  const { filters } = input;

  const entityType = filters.entityType.trim().toLowerCase();
  if (!entityType) {
    fieldErrors.entityType = 'Entity type is required';
  } else if (!SLUG_RE.test(entityType)) {
    fieldErrors.entityType = 'Entity type must be a lowercase slug';
  }

  const entityId = filters.entityId.trim();
  if (!entityId) {
    fieldErrors.entityId = 'Entity id is required';
  } else if (!OBJECT_ID_RE.test(entityId)) {
    fieldErrors.entityId = 'Entity id must be a 24-character ObjectId';
  }

  let module: string | undefined;
  if (filters.module.trim()) {
    const m = filters.module.trim().toLowerCase();
    if (!SLUG_RE.test(m)) {
      fieldErrors.module = 'Module must be a lowercase slug';
    } else {
      module = m;
    }
  }

  let projectId: string | undefined;
  if (filters.projectId.trim()) {
    const p = filters.projectId.trim();
    if (!OBJECT_ID_RE.test(p)) {
      fieldErrors.projectId = 'Project id must be a 24-character ObjectId';
    } else {
      projectId = p;
    }
  }

  let status: string | undefined;
  if (filters.status.trim()) {
    const s = filters.status.trim().toLowerCase();
    if (!STATUS_SET.has(s)) {
      fieldErrors.status = `Unsupported status “${filters.status}”`;
    } else {
      status = s;
    }
  }

  const ready =
    Boolean(entityType) &&
    Boolean(entityId) &&
    !fieldErrors.entityType &&
    !fieldErrors.entityId &&
    !fieldErrors.module &&
    !fieldErrors.projectId &&
    !fieldErrors.status;

  if (!ready) {
    return { ready: false, api: null, fieldErrors };
  }

  return {
    ready: true,
    api: {
      entityType,
      entityId,
      module,
      projectId,
      status,
      page: clampListPage(input.page),
      limit: clampListLimit(input.limit),
    },
    fieldErrors,
  };
}

export function defaultDocumentLibraryFilters(
  projectId = '',
): DocumentLibraryFilterState {
  return {
    entityType: '',
    entityId: '',
    module: '',
    projectId,
    status: DocumentStatus.Active,
    search: '',
  };
}
