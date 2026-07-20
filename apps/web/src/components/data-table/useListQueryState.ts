import { useCallback, useMemo, useState } from 'react';
import type { SortOrder } from '@luxaria/shared-types';
import {
  buildListQueryParams,
  clampListLimit,
  clampListPage,
  createInitialListQueryState,
  sanitizeSortBy,
  sanitizeSortOrder,
  type ListQueryState,
} from './listQuery';
import { sanitizeFilterRecord } from './tablePreferences';

type Options = {
  allowedSortKeys?: readonly string[];
  /** When set, applySaved / setFilters only keep these keys. */
  allowedFilterKeys?: readonly string[];
  defaultSortBy?: string;
  defaultSortOrder?: SortOrder;
  initial?: Partial<ListQueryState>;
};

/**
 * Client state for backend list conventions: page, limit, sort, search, filters.
 */
export function useListQueryState(options: Options = {}) {
  const allowedSortKeys = options.allowedSortKeys;
  const allowedFilterKeys = options.allowedFilterKeys;
  const [state, setState] = useState<ListQueryState>(() =>
    createInitialListQueryState(
      {
        sortBy: options.defaultSortBy,
        sortOrder: options.defaultSortOrder,
        ...options.initial,
        filters: sanitizeFilterRecord(
          options.initial?.filters ?? {},
          allowedFilterKeys,
        ),
      },
      allowedSortKeys,
    ),
  );

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page: clampListPage(page) }));
  }, []);

  const setLimit = useCallback(
    (limit: number) => {
      setState((prev) => ({
        ...prev,
        limit: clampListLimit(limit),
        page: 1,
      }));
    },
    [],
  );

  const setSort = useCallback(
    (sortBy: string, sortOrder: SortOrder) => {
      setState((prev) => ({
        ...prev,
        sortBy: allowedSortKeys
          ? sanitizeSortBy(sortBy, allowedSortKeys, options.defaultSortBy ?? 'createdAt')
          : sortBy,
        sortOrder: sanitizeSortOrder(sortOrder),
        page: 1,
      }));
    },
    [allowedSortKeys, options.defaultSortBy],
  );

  const setSearch = useCallback((search: string) => {
    setState((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setFilters = useCallback(
    (filters: Record<string, string>) => {
      setState((prev) => ({
        ...prev,
        filters: sanitizeFilterRecord(filters, allowedFilterKeys),
        page: 1,
      }));
    },
    [allowedFilterKeys],
  );

  const patchFilters = useCallback(
    (patch: Record<string, string>) => {
      setState((prev) => ({
        ...prev,
        filters: sanitizeFilterRecord(
          { ...prev.filters, ...patch },
          allowedFilterKeys,
        ),
        page: 1,
      }));
    },
    [allowedFilterKeys],
  );

  const reset = useCallback(() => {
    setState(
      createInitialListQueryState(
        {
          sortBy: options.defaultSortBy,
          sortOrder: options.defaultSortOrder,
          ...options.initial,
        },
        allowedSortKeys,
      ),
    );
  }, [allowedSortKeys, options.defaultSortBy, options.defaultSortOrder, options.initial]);

  const applySaved = useCallback(
    (saved: Partial<ListQueryState>) => {
      setState((prev) =>
        createInitialListQueryState(
          {
            ...prev,
            ...saved,
            page: 1,
            filters: sanitizeFilterRecord(
              saved.filters ?? prev.filters,
              allowedFilterKeys,
            ),
          },
          allowedSortKeys,
        ),
      );
    },
    [allowedSortKeys, allowedFilterKeys],
  );


  const queryParams = useMemo(
    () =>
      buildListQueryParams({
        ...state,
        allowedSortKeys,
        defaultSortBy: options.defaultSortBy,
        defaultSortOrder: options.defaultSortOrder,
      }),
    [state, allowedSortKeys, options.defaultSortBy, options.defaultSortOrder],
  );

  return {
    state,
    queryParams,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setFilters,
    patchFilters,
    reset,
    applySaved,
  };
}
