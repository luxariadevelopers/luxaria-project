import { useCallback, useMemo } from 'react';
import type { ListQueryState } from './listQuery';
import type { SavedFilter } from './tablePreferences';
import { useTablePreferences } from './useTablePreferences';

/** @deprecated Use `SavedFilter` from `./tablePreferences`. */
export type SavedFilterPreset = SavedFilter;

/**
 * Named list-query presets persisted in localStorage (per `scope` key).
 * Backed by schema-versioned table preferences (Micro Phase 018).
 * Does not invent server-side saved-filter APIs.
 */
export function useSavedFilters(scope: string | undefined) {
  const prefs = useTablePreferences({ scope });

  const save = useCallback(
    (
      name: string,
      query: Pick<
        ListQueryState,
        'search' | 'filters' | 'sortBy' | 'sortOrder' | 'limit'
      >,
    ) => {
      prefs.saveFilter(name, {
        search: query.search,
        filters: { ...query.filters },
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
      });
    },
    [prefs],
  );

  return useMemo(
    () => ({
      enabled: prefs.enabled,
      presets: prefs.savedFilters,
      save,
      remove: prefs.removeFilter,
      refresh: prefs.reload,
    }),
    [prefs.enabled, prefs.savedFilters, save, prefs.removeFilter, prefs.reload],
  );
}
