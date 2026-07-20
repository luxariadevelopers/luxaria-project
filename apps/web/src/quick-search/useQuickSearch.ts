import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { useProject } from '@/context/ProjectContext';
import {
  QUICK_SEARCH_DEBOUNCE_MS,
  QUICK_SEARCH_MIN_LENGTH,
} from './constants';
import {
  filterPermittedSources,
  flattenHits,
  groupQuickSearchResults,
  runQuickSearchSource,
} from './searchSources';
import { useDebouncedValue } from './useDebouncedValue';

export type UseQuickSearchArgs = {
  query: string;
  /** When false, skip network (palette closed). */
  enabled?: boolean;
};

/**
 * Debounced, permission-filtered multi-module search.
 * Backend still enforces permissions / project access on each list call.
 */
export function useQuickSearch({ query, enabled = true }: UseQuickSearchArgs) {
  const { hasPermission, access } = useAuth();
  const { selectedProjectId } = useProject();
  const debouncedQuery = useDebouncedValue(query, QUICK_SEARCH_DEBOUNCE_MS);
  const trimmed = debouncedQuery.trim();

  const permittedSources = useMemo(
    () =>
      filterPermittedSources({
        hasPermission,
        bypassPermissions: Boolean(access?.bypassPermissions),
      }),
    [hasPermission, access?.bypassPermissions],
  );

  const canSearch =
    enabled &&
    trimmed.length >= QUICK_SEARCH_MIN_LENGTH &&
    permittedSources.length > 0;

  const searchQuery = useQuery({
    queryKey: [
      'quick-search',
      trimmed,
      selectedProjectId,
      permittedSources.map((s) => s.id).join(','),
    ],
    queryFn: async () => {
      const results = await Promise.all(
        permittedSources.map((source) =>
          runQuickSearchSource(source, trimmed, selectedProjectId),
        ),
      );
      return results;
    },
    enabled: canSearch,
    retry: false,
    staleTime: 15_000,
  });

  const groups = useMemo(
    () =>
      groupQuickSearchResults(searchQuery.data ?? [], permittedSources),
    [searchQuery.data, permittedSources],
  );

  const hits = useMemo(() => flattenHits(groups), [groups]);

  const hasSourceErrors = groups.some((g) => g.errors.length > 0);
  const allSourcesFailed =
    canSearch &&
    Boolean(searchQuery.data) &&
    searchQuery.data!.length > 0 &&
    searchQuery.data!.every((r) => r.error != null);

  return {
    debouncedQuery: trimmed,
    permittedSources,
    hasAnySearchPermission: permittedSources.length > 0,
    belowMinLength:
      query.trim().length > 0 &&
      query.trim().length < QUICK_SEARCH_MIN_LENGTH,
    waitingForDebounce: query.trim() !== trimmed,
    groups,
    hits,
    isFetching: searchQuery.isFetching,
    isError: allSourcesFailed,
    hasSourceErrors,
    error: allSourcesFailed
      ? searchQuery.data?.find((r) => r.error)?.error
      : null,
    refetch: searchQuery.refetch,
    minLength: QUICK_SEARCH_MIN_LENGTH,
  };
}
