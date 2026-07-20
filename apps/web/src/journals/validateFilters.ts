import {
  clampListLimit,
  clampListPage,
} from '@/components/data-table/listQuery';
import { JournalStatus } from './types';
import type { ListJournalsQuery } from './types';

export type JournalFilterState = {
  status: string;
  projectId: string;
  financialYearId: string;
  sourceModule: string;
  from: string;
  to: string;
};

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const STATUS_SET = new Set<string>(Object.values(JournalStatus));
/** YYYY-MM-DD (Nest `@IsDateString` / journalDate filter). */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ValidatedJournalQuery = {
  api: ListJournalsQuery;
  fieldErrors: Partial<Record<keyof JournalFilterState, string>>;
  /** True when date range / ids are valid enough to query. */
  ready: boolean;
};

/**
 * Validate journal register filters against Nest `ListJournalsQueryDto`.
 * Nest has no `search` param — filters are the find mechanism.
 */
export function validateJournalFilters(input: {
  filters: JournalFilterState;
  page: number;
  limit: number;
}): ValidatedJournalQuery {
  const fieldErrors: Partial<Record<keyof JournalFilterState, string>> = {};
  const { filters } = input;
  const api: ListJournalsQuery = {
    page: clampListPage(input.page),
    limit: clampListLimit(input.limit),
  };

  if (filters.status.trim()) {
    if (!STATUS_SET.has(filters.status.trim())) {
      fieldErrors.status = 'Unsupported journal status';
    } else {
      api.status = filters.status.trim() as JournalStatus;
    }
  }

  if (filters.projectId.trim()) {
    if (!OBJECT_ID_RE.test(filters.projectId.trim())) {
      fieldErrors.projectId = 'Project id must be a 24-character ObjectId';
    } else {
      api.projectId = filters.projectId.trim();
    }
  }

  if (filters.financialYearId.trim()) {
    if (!OBJECT_ID_RE.test(filters.financialYearId.trim())) {
      fieldErrors.financialYearId =
        'Financial year id must be a 24-character ObjectId';
    } else {
      api.financialYearId = filters.financialYearId.trim();
    }
  }

  if (filters.sourceModule.trim()) {
    api.sourceModule = filters.sourceModule.trim().toLowerCase();
  }

  if (filters.from.trim()) {
    if (!DATE_RE.test(filters.from.trim())) {
      fieldErrors.from = 'From must be YYYY-MM-DD';
    } else {
      api.from = filters.from.trim();
    }
  }

  if (filters.to.trim()) {
    if (!DATE_RE.test(filters.to.trim())) {
      fieldErrors.to = 'To must be YYYY-MM-DD';
    } else {
      api.to = filters.to.trim();
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

  const ready = Object.keys(fieldErrors).length === 0;

  return { api, fieldErrors, ready };
}

export function defaultJournalFilters(
  projectId = '',
): JournalFilterState {
  return {
    status: '',
    projectId,
    financialYearId: '',
    sourceModule: '',
    from: '',
    to: '',
  };
}
