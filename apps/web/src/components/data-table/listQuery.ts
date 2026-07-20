import type { SortOrder } from '@luxaria/shared-types';

/** Matches `PaginationQueryDto` defaults / `@Max(100)`. */
export const DEFAULT_LIST_PAGE_SIZE = 20;
export const MAX_LIST_PAGE_SIZE = 100;
export const MIN_LIST_PAGE = 1;
export const LIST_PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100] as const;

export type ListQueryState = {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: SortOrder;
  search: string;
  filters: Record<string, string>;
};

export type BuildListQueryParamsInput = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
  filters?: Record<string, string | undefined | null>;
  /** When set, unsupported `sortBy` values fall back to `defaultSortBy`. */
  allowedSortKeys?: readonly string[];
  defaultSortBy?: string;
  defaultSortOrder?: SortOrder;
};

/**
 * Clamp page size to backend rules: 1…100 (PaginationQueryDto `@Min(1)` `@Max(100)`).
 * Unknown / invalid values → default 20.
 */
export function clampListLimit(limit: unknown): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    return DEFAULT_LIST_PAGE_SIZE;
  }
  const n = Math.trunc(limit);
  if (n < 1) return DEFAULT_LIST_PAGE_SIZE;
  if (n > MAX_LIST_PAGE_SIZE) return MAX_LIST_PAGE_SIZE;
  return n;
}

/** Ensure page is an integer ≥ 1. */
export function clampListPage(page: unknown): number {
  if (typeof page !== 'number' || !Number.isFinite(page)) {
    return MIN_LIST_PAGE;
  }
  const n = Math.trunc(page);
  return n < MIN_LIST_PAGE ? MIN_LIST_PAGE : n;
}

/**
 * Reject unsupported sort keys (per-module allow-lists, e.g. projects `ALLOWED_SORT`).
 */
export function sanitizeSortBy(
  sortBy: string | undefined,
  allowedSortKeys: readonly string[],
  defaultSortBy = 'createdAt',
): string {
  if (sortBy && allowedSortKeys.includes(sortBy)) {
    return sortBy;
  }
  if (allowedSortKeys.includes(defaultSortBy)) {
    return defaultSortBy;
  }
  return allowedSortKeys[0] ?? defaultSortBy;
}

export function sanitizeSortOrder(
  sortOrder: string | undefined,
  fallback: SortOrder = 'desc',
): SortOrder {
  return sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : fallback;
}

/**
 * Build query params for Nest list endpoints using `PaginationQueryDto`
 * (+ optional `search` and extra filter keys). Omits empty strings.
 */
export function buildListQueryParams(
  input: BuildListQueryParamsInput,
): Record<string, string | number> {
  const defaultSortBy = input.defaultSortBy ?? 'createdAt';
  const sortBy = input.allowedSortKeys
    ? sanitizeSortBy(input.sortBy, input.allowedSortKeys, defaultSortBy)
    : (input.sortBy?.trim() || defaultSortBy);

  const params: Record<string, string | number> = {
    page: clampListPage(input.page),
    limit: clampListLimit(input.limit),
    sortBy,
    sortOrder: sanitizeSortOrder(input.sortOrder, input.defaultSortOrder ?? 'desc'),
  };

  const search = input.search?.trim();
  if (search) {
    params.search = search;
  }

  if (input.filters) {
    for (const [key, value] of Object.entries(input.filters)) {
      if (value == null) continue;
      const trimmed = String(value).trim();
      if (trimmed.length === 0) continue;
      params[key] = trimmed;
    }
  }

  return params;
}

export function createInitialListQueryState(
  overrides: Partial<ListQueryState> = {},
  allowedSortKeys?: readonly string[],
): ListQueryState {
  const defaultSortBy = overrides.sortBy ?? 'createdAt';
  return {
    page: clampListPage(overrides.page ?? MIN_LIST_PAGE),
    limit: clampListLimit(overrides.limit ?? DEFAULT_LIST_PAGE_SIZE),
    sortBy: allowedSortKeys
      ? sanitizeSortBy(defaultSortBy, allowedSortKeys, 'createdAt')
      : defaultSortBy,
    sortOrder: sanitizeSortOrder(overrides.sortOrder, 'desc'),
    search: overrides.search ?? '',
    filters: { ...(overrides.filters ?? {}) },
  };
}
