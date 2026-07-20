import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridSortModel,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import { EmptyState, RetryPanel } from '@/components/errors';
import { ExportButton } from './ExportButton';
import {
  DEFAULT_LIST_PAGE_SIZE,
  LIST_PAGE_SIZE_OPTIONS,
  clampListLimit,
  sanitizeSortBy,
  sanitizeSortOrder,
} from './listQuery';
import { RowActionsMenu } from './RowActionsMenu';
import { TableSettingsPanel } from './TableSettingsPanel';
import type { DataTableProps } from './types';
import { useTablePreferences } from './useTablePreferences';

export type { DataTableProps, DataTableRowAction } from './types';

export function DataTable<R extends GridValidRowModel>({
  title,
  rows,
  columns,
  loading = false,
  error,
  onRetry,
  emptyTitle = 'No results',
  emptyDescription = 'Try adjusting search or filters.',
  height = 480,
  getRowId,
  onRowClick,
  paginationMode = 'client',
  page = 1,
  pageSize = DEFAULT_LIST_PAGE_SIZE,
  rowCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = LIST_PAGE_SIZE_OPTIONS,
  sortingMode = 'client',
  sortBy,
  sortOrder = 'desc',
  allowedSortKeys,
  onSortChange,
  search,
  searchPlaceholder = 'Search…',
  onSearchChange,
  filterSlot,
  preferencesKey,
  savedFiltersKey,
  allowedFilterKeys,
  filterValues = {},
  onApplySavedQuery,
  onResetPreferences,
  checkboxSelection,
  rowSelectionModel,
  onRowSelectionModelChange,
  rowActions,
  toolbarActions,
  showExport = false,
  exportFileName = 'export',
  exportPermission,
  showColumnVisibility = true,
}: DataTableProps<R>) {
  const prefsScope = preferencesKey ?? savedFiltersKey;
  const [searchDraft, setSearchDraft] = useState(search ?? '');
  const pageSizeHydrated = useRef(false);

  const columnFields = useMemo(
    () =>
      columns
        .map((c) => c.field)
        .filter((field): field is string => Boolean(field)),
    [columns],
  );

  const prefs = useTablePreferences({
    scope: prefsScope,
    allowedColumnFields: columnFields,
    allowedSortKeys,
    allowedFilterKeys,
    defaultSortBy: sortBy ?? 'createdAt',
  });

  // Restore remembered page size once after mount (preferences cannot invent sizes).
  useEffect(() => {
    if (pageSizeHydrated.current || !prefs.enabled) return;
    pageSizeHydrated.current = true;
    if (prefs.pageSize != null && onPageSizeChange) {
      onPageSizeChange(clampListLimit(prefs.pageSize));
    }
  }, [prefs.enabled, prefs.pageSize, onPageSizeChange]);

  const safePageSize = clampListLimit(pageSize);
  const safeOptions = useMemo(
    () =>
      pageSizeOptions
        .map((n) => clampListLimit(n))
        .filter((n, i, arr) => arr.indexOf(n) === i),
    [pageSizeOptions],
  );

  const gridColumns = useMemo(() => {
    const base: GridColDef<R>[] = columns.map((col) => {
      if (!allowedSortKeys || allowedSortKeys.length === 0) {
        return col;
      }
      if (col.sortable === false) return col;
      if (!allowedSortKeys.includes(col.field)) {
        return { ...col, sortable: false };
      }
      return col;
    });

    if (
      !rowActions ||
      (typeof rowActions !== 'function' && rowActions.length === 0)
    ) {
      return base;
    }

    const actionsCol: GridColDef<R> = {
      field: '__actions',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const actions =
          typeof rowActions === 'function'
            ? rowActions(params.row)
            : rowActions;
        return <RowActionsMenu row={params.row} actions={actions} />;
      },
    };
    return [...base, actionsCol];
  }, [columns, rowActions, allowedSortKeys]);

  const sortModel: GridSortModel = useMemo(() => {
    if (!sortBy) return [];
    if (allowedSortKeys && !allowedSortKeys.includes(sortBy)) return [];
    return [{ field: sortBy, sort: sortOrder }];
  }, [sortBy, sortOrder, allowedSortKeys]);

  const showSettings =
    prefs.enabled &&
    (Boolean(onApplySavedQuery) || showColumnVisibility);

  const showToolbar =
    Boolean(onSearchChange) ||
    Boolean(filterSlot) ||
    showExport ||
    showSettings ||
    Boolean(toolbarActions);

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        {title ? (
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            {title}
          </Typography>
        ) : null}
        <RetryPanel error={error} onRetry={onRetry} forceRetry={Boolean(onRetry)} />
      </Paper>
    );
  }

  const isEmpty = !loading && rows.length === 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {title ? (
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {title}
        </Typography>
      ) : null}

      {showToolbar ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 1.5, alignItems: { sm: 'center' }, flexWrap: 'wrap' }}
        >
          {onSearchChange ? (
            <TextField
              size="small"
              value={searchDraft}
              placeholder={searchPlaceholder}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearchChange(searchDraft);
                }
              }}
              onBlur={() => onSearchChange(searchDraft)}
              sx={{ minWidth: 220, flex: 1 }}
              slotProps={{
                htmlInput: { 'aria-label': 'Search' },
              }}
            />
          ) : null}
          {filterSlot}
          <Box sx={{ flex: 1 }} />
          {toolbarActions}
          {showSettings ? (
            <TableSettingsPanel
              columns={gridColumns}
              columnVisibility={prefs.columnVisibility}
              onColumnVisibilityChange={prefs.setColumnVisibility}
              savedFilters={prefs.savedFilters}
              currentQuery={{
                search: search ?? '',
                filters: filterValues,
                sortBy: sortBy ?? 'createdAt',
                sortOrder,
                limit: safePageSize,
              }}
              onSaveFilter={prefs.saveFilter}
              onApplyFilter={(query) => {
                const safe = prefs.resolveFilterQuery(query);
                if (safe && onApplySavedQuery) {
                  onApplySavedQuery(safe);
                }
              }}
              onRemoveFilter={prefs.removeFilter}
              onReset={() => {
                prefs.reset();
                onResetPreferences?.();
              }}
            />
          ) : null}
          {showExport ? (
            <ExportButton
              rows={[...rows]}
              columns={gridColumns}
              fileName={exportFileName}
              permission={exportPermission}
              disabled={loading || rows.length === 0}
            />
          ) : null}
        </Stack>
      ) : null}

      {isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <Box sx={{ height, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={gridColumns}
            loading={loading}
            getRowId={getRowId}
            checkboxSelection={checkboxSelection}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={onRowSelectionModelChange}
            onRowClick={onRowClick}
            disableRowSelectionOnClick
            density="compact"
            columnVisibilityModel={prefs.columnVisibility}
            onColumnVisibilityModelChange={(model) =>
              prefs.setColumnVisibility(model as Record<string, boolean>)
            }
            paginationMode={paginationMode}
            sortingMode={sortingMode}
            rowCount={
              paginationMode === 'server'
                ? (rowCount ?? rows.length)
                : undefined
            }
            paginationModel={{
              page: Math.max(0, page - 1),
              pageSize: safePageSize,
            }}
            onPaginationModelChange={(model) => {
              const nextSize = clampListLimit(model.pageSize);
              if (nextSize !== safePageSize) {
                onPageSizeChange?.(nextSize);
                if (prefs.enabled) {
                  prefs.setPageSizePreference(nextSize);
                }
              }
              onPageChange?.(model.page + 1);
            }}
            pageSizeOptions={[...safeOptions]}
            sortModel={sortModel}
            onSortModelChange={(model) => {
              if (!onSortChange) return;
              const first = model[0];
              if (!first?.field || !first.sort) return;
              if (allowedSortKeys && !allowedSortKeys.includes(first.field)) {
                return;
              }
              const nextSortBy = allowedSortKeys
                ? sanitizeSortBy(first.field, allowedSortKeys, sortBy ?? 'createdAt')
                : first.field;
              onSortChange(nextSortBy, sanitizeSortOrder(first.sort));
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'action.hover',
              },
            }}
          />
        </Box>
      )}
    </Paper>
  );
}
