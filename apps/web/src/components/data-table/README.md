# Web DataTable (Micro Phase 007 + 018)

Production list pattern for Luxaria web. Aligns with Nest `PaginationQueryDto`:

| Param | Rules |
|-------|--------|
| `page` | ≥ 1 |
| `limit` | 1–100 (default 20) |
| `sortBy` | Per-module allow-list via `allowedSortKeys` |
| `sortOrder` | `asc` \| `desc` |
| `search` | Optional string (many list DTOs) |

## Table preferences (Phase 018)

Persisted in **localStorage** (no table-preference API exists; notification prefs are unrelated).

| Piece | Role |
|-------|------|
| `tablePreferences` | Schema v1 load/migrate/sanitize/reset |
| `useTablePreferences` | React hook for columns, saved filters, page size |
| `TableSettingsPanel` | Saved filters · column preferences · reset |

Storage key: `luxaria.table-prefs.<scope>` with `schemaVersion: 1`.

Legacy Phase 007 key `luxaria.data-table.filters.<scope>` (bare array) is migrated automatically, then removed.

### Security

Preferences **cannot bypass permissions**:

- `allowedSortKeys` / `allowedFilterKeys` sanitize restored queries
- Unknown column fields are dropped
- Page size is clamped 1–100
- Export / row actions still require catalog permissions
- Route guards and API 403 handling remain authoritative
- `ExportButton` opens shared `ExportDialog` (`src/export`) for CSV field selection

### Usage

```tsx
const list = useListQueryState({
  allowedSortKeys: ['createdAt', 'projectName'],
  allowedFilterKeys: ['status'],
  defaultSortBy: 'createdAt',
});

<DataTable
  rows={rows}
  columns={columns}
  paginationMode="server"
  sortingMode="server"
  page={list.state.page}
  pageSize={list.state.limit}
  rowCount={meta?.total}
  onPageChange={list.setPage}
  onPageSizeChange={list.setLimit}
  sortBy={list.state.sortBy}
  sortOrder={list.state.sortOrder}
  allowedSortKeys={['createdAt', 'projectName']}
  allowedFilterKeys={['status']}
  onSortChange={list.setSort}
  search={list.state.search}
  onSearchChange={list.setSearch}
  filterValues={list.state.filters}
  preferencesKey="projects"
  onApplySavedQuery={list.applySaved}
  onResetPreferences={list.reset}
  showExport
  exportPermission="project.view"
/>
```

## Mobile cards (below `sm`)

On viewports below the `sm` breakpoint, DataTable renders **card/list rows** instead of the horizontal spreadsheet:

| Slot | Source |
|------|--------|
| Primary | `mobileCard.primaryField` or first visible column |
| Meta (≤2) | `mobileCard.metaFields` or next non-status columns |
| Status chip | `mobileCard.statusField` or a `*status*` field |
| Actions | Same `rowActions` as the grid |

Pass `mobileCard={{ disabled: true }}` to keep the grid on phones. Server pagination still uses `page` / `pageSize` / `rowCount`.

Demo story (no sidebar link): `/dev/data-table`.
