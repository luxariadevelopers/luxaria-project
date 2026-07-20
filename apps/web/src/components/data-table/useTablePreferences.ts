import { useCallback, useMemo, useState } from 'react';
import {
  createDefaultTablePreferences,
  loadTablePreferences,
  persistTablePreferences,
  resetTablePreferences,
  sanitizeColumnVisibility,
  sanitizeSavedFilterQuery,
  type SavedFilter,
  type SavedFilterQuery,
  type TablePreferences,
  type TablePreferencesSanitizeOptions,
} from './tablePreferences';

export type UseTablePreferencesArgs = TablePreferencesSanitizeOptions & {
  /** Storage scope, e.g. `projects` or `approvals.list`. */
  scope: string | undefined;
};

/**
 * User-level table preferences (columns, saved filters, page size).
 * Persisted in localStorage with schema-version validation — no preference API.
 */
export function useTablePreferences({
  scope,
  allowedColumnFields,
  allowedSortKeys,
  allowedFilterKeys,
  defaultSortBy,
  maxSavedFilters = 20,
}: UseTablePreferencesArgs) {
  const sanitizeOptions = useMemo(
    (): TablePreferencesSanitizeOptions => ({
      allowedColumnFields,
      allowedSortKeys,
      allowedFilterKeys,
      defaultSortBy,
      maxSavedFilters,
    }),
    [
      allowedColumnFields,
      allowedSortKeys,
      allowedFilterKeys,
      defaultSortBy,
      maxSavedFilters,
    ],
  );

  const [prefs, setPrefs] = useState<TablePreferences>(() =>
    scope
      ? loadTablePreferences(scope, sanitizeOptions)
      : createDefaultTablePreferences(),
  );

  const commit = useCallback(
    (updater: (prev: TablePreferences) => TablePreferences) => {
      if (!scope) return;
      setPrefs((prev) => {
        const next = updater(prev);
        persistTablePreferences(scope, next);
        return next;
      });
    },
    [scope],
  );

  const reload = useCallback(() => {
    if (!scope) {
      setPrefs(createDefaultTablePreferences());
      return;
    }
    setPrefs(loadTablePreferences(scope, sanitizeOptions));
  }, [scope, sanitizeOptions]);

  const setColumnVisibility = useCallback(
    (model: Record<string, boolean>) => {
      commit((prev) => ({
        ...prev,
        columnVisibility: sanitizeColumnVisibility(
          model,
          allowedColumnFields,
        ),
      }));
    },
    [commit, allowedColumnFields],
  );

  const setPageSizePreference = useCallback(
    (pageSize: number | null) => {
      commit((prev) => ({
        ...prev,
        pageSize,
      }));
    },
    [commit],
  );

  const saveFilter = useCallback(
    (name: string, query: SavedFilterQuery) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const safeQuery = sanitizeSavedFilterQuery(query, sanitizeOptions);
      if (!safeQuery) return;
      const nextFilter: SavedFilter = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        createdAt: new Date().toISOString(),
        query: safeQuery,
      };
      commit((prev) => ({
        ...prev,
        savedFilters: [nextFilter, ...prev.savedFilters].slice(
          0,
          maxSavedFilters,
        ),
      }));
    },
    [commit, sanitizeOptions, maxSavedFilters],
  );

  const removeFilter = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        savedFilters: prev.savedFilters.filter((f) => f.id !== id),
      }));
    },
    [commit],
  );

  const reset = useCallback(() => {
    if (!scope) {
      const defaults = createDefaultTablePreferences();
      setPrefs(defaults);
      return defaults;
    }
    const defaults = resetTablePreferences(scope);
    setPrefs(defaults);
    return defaults;
  }, [scope]);

  /** Apply a saved filter through sanitizers (cannot bypass allow-lists). */
  const resolveFilterQuery = useCallback(
    (query: SavedFilterQuery): SavedFilterQuery | null =>
      sanitizeSavedFilterQuery(query, sanitizeOptions),
    [sanitizeOptions],
  );

  return useMemo(
    () => ({
      enabled: Boolean(scope),
      preferences: prefs,
      columnVisibility: prefs.columnVisibility,
      savedFilters: prefs.savedFilters,
      pageSize: prefs.pageSize,
      setColumnVisibility,
      setPageSizePreference,
      saveFilter,
      removeFilter,
      resolveFilterQuery,
      reset,
      reload,
    }),
    [
      scope,
      prefs,
      setColumnVisibility,
      setPageSizePreference,
      saveFilter,
      removeFilter,
      resolveFilterQuery,
      reset,
      reload,
    ],
  );
}

/** @deprecated Prefer `SavedFilter` from `tablePreferences`. */
export type SavedFilterPreset = SavedFilter;
