import type { SortOrder } from '@luxaria/shared-types';
import {
  clampListLimit,
  DEFAULT_LIST_PAGE_SIZE,
  sanitizeSortBy,
  sanitizeSortOrder,
} from './listQuery';

/** Bump when the persisted shape changes incompatibly. */
export const TABLE_PREFERENCES_SCHEMA_VERSION = 1 as const;

/** Current supported schema version for stored table preferences. */
export type TablePreferencesSchemaVersion =
  typeof TABLE_PREFERENCES_SCHEMA_VERSION;

export type SavedFilterQuery = {
  search: string;
  filters: Record<string, string>;
  sortBy: string;
  sortOrder: SortOrder;
  limit: number;
};

/** Named list-query preset (Micro Phase 018). */
export type SavedFilter = {
  id: string;
  name: string;
  createdAt: string;
  query: SavedFilterQuery;
};

export type TablePreferences = {
  schemaVersion: TablePreferencesSchemaVersion;
  updatedAt: string;
  columnVisibility: Record<string, boolean>;
  savedFilters: SavedFilter[];
  /** Remembered page size; null = use page default. */
  pageSize: number | null;
};

export type TablePreferencesSanitizeOptions = {
  /** Column fields currently available on the table. */
  allowedColumnFields?: readonly string[];
  /** Sort keys allowed by the list endpoint / UI. */
  allowedSortKeys?: readonly string[];
  /** Filter keys the page is allowed to persist/apply. */
  allowedFilterKeys?: readonly string[];
  defaultSortBy?: string;
  maxSavedFilters?: number;
};

const LEGACY_FILTERS_PREFIX = 'luxaria.data-table.filters.';
const PREFS_PREFIX = 'luxaria.table-prefs.';

export function tablePreferencesStorageKey(scope: string): string {
  return `${PREFS_PREFIX}${scope}`;
}

export function legacySavedFiltersStorageKey(scope: string): string {
  return `${LEGACY_FILTERS_PREFIX}${scope}`;
}

export function createDefaultTablePreferences(): TablePreferences {
  return {
    schemaVersion: TABLE_PREFERENCES_SCHEMA_VERSION,
    updatedAt: new Date(0).toISOString(),
    columnVisibility: {},
    savedFilters: [],
    pageSize: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeFilterKey(key: string): boolean {
  return (
    key.length > 0 &&
    key !== '__proto__' &&
    key !== 'constructor' &&
    key !== 'prototype'
  );
}

/**
 * Strip unknown / unsafe filter keys so preferences cannot invent query params
 * or bypass intended filter surfaces.
 */
export function sanitizeFilterRecord(
  filters: unknown,
  allowedFilterKeys?: readonly string[],
): Record<string, string> {
  if (!isRecord(filters)) {
    return {};
  }
  const out: Record<string, string> = {};
  if (allowedFilterKeys) {
    for (const key of allowedFilterKeys) {
      if (!isSafeFilterKey(key)) continue;
      const value = filters[key];
      if (typeof value === 'string') {
        out[key] = value;
      }
    }
    return out;
  }
  for (const [key, value] of Object.entries(filters)) {
    if (!isSafeFilterKey(key)) continue;
    if (typeof value === 'string') {
      out[key] = value;
    }
  }
  return out;
}

export function sanitizeSavedFilterQuery(
  query: unknown,
  options: TablePreferencesSanitizeOptions = {},
): SavedFilterQuery | null {
  if (!isRecord(query)) {
    return null;
  }
  const search = typeof query.search === 'string' ? query.search : '';
  const sortOrder = sanitizeSortOrder(
    typeof query.sortOrder === 'string' ? query.sortOrder : 'desc',
  );
  const defaultSort = options.defaultSortBy ?? 'createdAt';
  const sortBy =
    options.allowedSortKeys && options.allowedSortKeys.length > 0
      ? sanitizeSortBy(
          typeof query.sortBy === 'string' ? query.sortBy : defaultSort,
          options.allowedSortKeys,
          defaultSort,
        )
      : typeof query.sortBy === 'string' && query.sortBy.trim()
        ? query.sortBy.trim()
        : defaultSort;

  return {
    search,
    filters: sanitizeFilterRecord(query.filters, options.allowedFilterKeys),
    sortBy,
    sortOrder,
    limit: clampListLimit(
      typeof query.limit === 'number' ? query.limit : DEFAULT_LIST_PAGE_SIZE,
    ),
  };
}

export function sanitizeSavedFilter(
  value: unknown,
  options: TablePreferencesSanitizeOptions = {},
): SavedFilter | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.id !== 'string' || !value.id.trim()) {
    return null;
  }
  if (typeof value.name !== 'string' || !value.name.trim()) {
    return null;
  }
  const query = sanitizeSavedFilterQuery(value.query, options);
  if (!query) {
    return null;
  }
  return {
    id: value.id.trim(),
    name: value.name.trim(),
    createdAt:
      typeof value.createdAt === 'string' && value.createdAt
        ? value.createdAt
        : new Date(0).toISOString(),
    query,
  };
}

export function sanitizeColumnVisibility(
  model: unknown,
  allowedColumnFields?: readonly string[],
): Record<string, boolean> {
  if (!isRecord(model)) {
    return {};
  }
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(model)) {
    if (!isSafeFilterKey(key) || key === '__actions') continue;
    if (typeof value !== 'boolean') continue;
    if (allowedColumnFields && !allowedColumnFields.includes(key)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Validate / migrate a parsed preferences blob.
 * Unknown schema versions and corrupt payloads fall back to defaults
 * (optionally merging recoverable legacy filter arrays).
 */
export function migrateTablePreferences(
  raw: unknown,
  options: TablePreferencesSanitizeOptions = {},
): TablePreferences {
  const defaults = createDefaultTablePreferences();
  const maxFilters = options.maxSavedFilters ?? 20;

  // Legacy Phase 007 shape: bare SavedFilter[] array
  if (Array.isArray(raw)) {
    const savedFilters = raw
      .map((item) => sanitizeSavedFilter(item, options))
      .filter((item): item is SavedFilter => item !== null)
      .slice(0, maxFilters);
    return {
      ...defaults,
      updatedAt: new Date().toISOString(),
      savedFilters,
    };
  }

  if (!isRecord(raw)) {
    return defaults;
  }

  const version = raw.schemaVersion;
  if (version !== TABLE_PREFERENCES_SCHEMA_VERSION) {
    // Future / unknown version: try to salvage filters + columns if present
    const salvagedFilters = Array.isArray(raw.savedFilters)
      ? raw.savedFilters
          .map((item) => sanitizeSavedFilter(item, options))
          .filter((item): item is SavedFilter => item !== null)
          .slice(0, maxFilters)
      : [];
    return {
      ...defaults,
      updatedAt: new Date().toISOString(),
      columnVisibility: sanitizeColumnVisibility(
        raw.columnVisibility,
        options.allowedColumnFields,
      ),
      savedFilters: salvagedFilters,
      pageSize:
        typeof raw.pageSize === 'number'
          ? clampListLimit(raw.pageSize)
          : null,
    };
  }

  const savedFilters = Array.isArray(raw.savedFilters)
    ? raw.savedFilters
        .map((item) => sanitizeSavedFilter(item, options))
        .filter((item): item is SavedFilter => item !== null)
        .slice(0, maxFilters)
    : [];

  return {
    schemaVersion: TABLE_PREFERENCES_SCHEMA_VERSION,
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt
        ? raw.updatedAt
        : new Date().toISOString(),
    columnVisibility: sanitizeColumnVisibility(
      raw.columnVisibility,
      options.allowedColumnFields,
    ),
    savedFilters,
    pageSize:
      raw.pageSize === null
        ? null
        : typeof raw.pageSize === 'number'
          ? clampListLimit(raw.pageSize)
          : null,
  };
}

function readJson(key: string): unknown | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null || raw === '') {
      return undefined;
    }
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode
  }
}

/**
 * Load preferences for a table scope. Migrates legacy filter arrays and
 * rejects / sanitizes invalid schema payloads.
 */
export function loadTablePreferences(
  scope: string,
  options: TablePreferencesSanitizeOptions = {},
): TablePreferences {
  const currentKey = tablePreferencesStorageKey(scope);
  const currentRaw = readJson(currentKey);
  if (currentRaw !== undefined) {
    const migrated = migrateTablePreferences(currentRaw, options);
    // Rewrite when migration repaired the payload
    persistTablePreferences(scope, migrated);
    return migrated;
  }

  const legacyRaw = readJson(legacySavedFiltersStorageKey(scope));
  if (legacyRaw !== undefined) {
    const migrated = migrateTablePreferences(legacyRaw, options);
    persistTablePreferences(scope, migrated);
    try {
      window.localStorage.removeItem(legacySavedFiltersStorageKey(scope));
    } catch {
      // ignore
    }
    return migrated;
  }

  return createDefaultTablePreferences();
}

export function persistTablePreferences(
  scope: string,
  prefs: TablePreferences,
): void {
  const payload: TablePreferences = {
    ...prefs,
    schemaVersion: TABLE_PREFERENCES_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  writeJson(tablePreferencesStorageKey(scope), payload);
}

export function resetTablePreferences(scope: string): TablePreferences {
  const defaults = createDefaultTablePreferences();
  defaults.updatedAt = new Date().toISOString();
  persistTablePreferences(scope, defaults);
  try {
    window.localStorage.removeItem(legacySavedFiltersStorageKey(scope));
  } catch {
    // ignore
  }
  return defaults;
}
