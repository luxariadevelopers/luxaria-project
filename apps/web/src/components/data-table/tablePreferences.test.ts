import { beforeEach, describe, expect, it } from 'vitest';
import {
  TABLE_PREFERENCES_SCHEMA_VERSION,
  createDefaultTablePreferences,
  legacySavedFiltersStorageKey,
  loadTablePreferences,
  migrateTablePreferences,
  resetTablePreferences,
  sanitizeFilterRecord,
  sanitizeSavedFilterQuery,
  tablePreferencesStorageKey,
} from './tablePreferences';

describe('tablePreferences migration & sanitization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults for invalid / non-object payloads', () => {
    expect(migrateTablePreferences(null)).toEqual(
      expect.objectContaining({
        schemaVersion: TABLE_PREFERENCES_SCHEMA_VERSION,
        savedFilters: [],
        columnVisibility: {},
        pageSize: null,
      }),
    );
    expect(migrateTablePreferences('nope').savedFilters).toEqual([]);
    expect(migrateTablePreferences(42).columnVisibility).toEqual({});
  });

  it('migrates legacy bare filter arrays (Phase 007)', () => {
    const migrated = migrateTablePreferences(
      [
        {
          id: 'f1',
          name: 'Active',
          createdAt: '2026-01-01T00:00:00.000Z',
          query: {
            search: 'lux',
            filters: { status: 'active', hack: 'x' },
            sortBy: 'createdAt',
            sortOrder: 'desc',
            limit: 20,
          },
        },
        { id: 'bad' },
      ],
      { allowedFilterKeys: ['status'], allowedSortKeys: ['createdAt', 'name'] },
    );

    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.savedFilters).toHaveLength(1);
    expect(migrated.savedFilters[0]?.name).toBe('Active');
    expect(migrated.savedFilters[0]?.query.filters).toEqual({
      status: 'active',
    });
    expect(migrated.savedFilters[0]?.query.filters.hack).toBeUndefined();
  });

  it('salvages recoverable fields from unknown schema versions', () => {
    const migrated = migrateTablePreferences(
      {
        schemaVersion: 99,
        columnVisibility: { name: false, __actions: false, ghost: true },
        savedFilters: [
          {
            id: 'f1',
            name: 'Old',
            createdAt: '2026-01-01T00:00:00.000Z',
            query: {
              search: '',
              filters: { status: 'draft' },
              sortBy: 'amount',
              sortOrder: 'asc',
              limit: 500,
            },
          },
        ],
        pageSize: 50,
      },
      {
        allowedColumnFields: ['name', 'code'],
        allowedSortKeys: ['createdAt', 'name'],
        allowedFilterKeys: ['status'],
        defaultSortBy: 'createdAt',
      },
    );

    expect(migrated.schemaVersion).toBe(TABLE_PREFERENCES_SCHEMA_VERSION);
    expect(migrated.columnVisibility).toEqual({ name: false });
    expect(migrated.savedFilters[0]?.query.sortBy).toBe('createdAt');
    expect(migrated.savedFilters[0]?.query.limit).toBe(100);
    expect(migrated.pageSize).toBe(50);
  });

  it('strips unsafe filter keys so preferences cannot invent params', () => {
    expect(
      sanitizeFilterRecord(
        { status: 'ok', __proto__: 'x', constructor: 'y' },
        ['status'],
      ),
    ).toEqual({ status: 'ok' });
  });

  it('rejects invalid saved filter queries', () => {
    expect(sanitizeSavedFilterQuery(null)).toBeNull();
    expect(sanitizeSavedFilterQuery({ search: 1 })).not.toBeNull();
  });

  it('loads legacy localStorage key and migrates to versioned key', () => {
    const scope = 'demo-list';
    localStorage.setItem(
      legacySavedFiltersStorageKey(scope),
      JSON.stringify([
        {
          id: 'legacy-1',
          name: 'Legacy',
          createdAt: '2026-02-01T00:00:00.000Z',
          query: {
            search: 'a',
            filters: { status: 'active' },
            sortBy: 'createdAt',
            sortOrder: 'desc',
            limit: 10,
          },
        },
      ]),
    );

    const loaded = loadTablePreferences(scope, {
      allowedFilterKeys: ['status'],
      allowedSortKeys: ['createdAt'],
    });

    expect(loaded.savedFilters[0]?.name).toBe('Legacy');
    expect(localStorage.getItem(tablePreferencesStorageKey(scope))).toBeTruthy();
    expect(localStorage.getItem(legacySavedFiltersStorageKey(scope))).toBeNull();
  });

  it('reset clears current and legacy keys', () => {
    const scope = 'reset-me';
    localStorage.setItem(
      tablePreferencesStorageKey(scope),
      JSON.stringify({
        ...createDefaultTablePreferences(),
        savedFilters: [
          {
            id: '1',
            name: 'X',
            createdAt: 't',
            query: {
              search: '',
              filters: {},
              sortBy: 'createdAt',
              sortOrder: 'desc',
              limit: 20,
            },
          },
        ],
      }),
    );
    localStorage.setItem(legacySavedFiltersStorageKey(scope), '[]');

    const reset = resetTablePreferences(scope);
    expect(reset.savedFilters).toEqual([]);
    const stored = JSON.parse(
      localStorage.getItem(tablePreferencesStorageKey(scope)) ?? '{}',
    ) as { savedFilters: unknown[] };
    expect(stored.savedFilters).toEqual([]);
    expect(localStorage.getItem(legacySavedFiltersStorageKey(scope))).toBeNull();
  });
});
