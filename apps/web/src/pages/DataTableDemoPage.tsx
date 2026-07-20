import { useMemo, useState } from 'react';
import {
  Alert,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type { GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { formatDate, formatInr } from '@/format';
import {
  DataTable,
  buildListQueryParams,
  useListQueryState,
  type DataTableRowAction,
} from '@/components/data-table';
import { useNotify } from '@/components/NotificationProvider';

type DemoRow = {
  id: string;
  code: string;
  name: string;
  status: 'draft' | 'active' | 'closed';
  amount: number;
  createdAt: string;
};

/** Static fixture data for the component demo (no invented API calls). */
const ALL_ROWS: DemoRow[] = Array.from({ length: 47 }, (_, i) => {
  const n = i + 1;
  const statuses = ['draft', 'active', 'closed'] as const;
  return {
    id: `demo-${n}`,
    code: `PRJ-${String(n).padStart(3, '0')}`,
    name: `Sample project ${n}`,
    status: statuses[i % 3],
    amount: (n * 12500.5) % 1000000,
    createdAt: new Date(Date.UTC(2026, 0, 1 + (i % 28))).toISOString(),
  };
});

/** Mirrors projects-style allow-list pattern (see backend `ALLOWED_SORT`). */
const ALLOWED_SORT = ['createdAt', 'code', 'name', 'amount', 'status'] as const;

/**
 * Dev-only story page for the standardised DataTable pattern.
 * Not linked in the sidebar (Micro Phase 007).
 */
export function DataTableDemoPage() {
  const { success, info } = useNotify();
  const [selection, setSelection] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set(),
  });
  const [simulate, setSimulate] = useState<'ok' | 'loading' | 'empty' | 'error'>(
    'ok',
  );

  const list = useListQueryState({
    allowedSortKeys: ALLOWED_SORT,
    allowedFilterKeys: ['status'],
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    initial: { limit: 10 },
  });

  const queryParams = list.queryParams;

  const pageRows = useMemo(() => {
    let filtered = [...ALL_ROWS];
    const search = String(queryParams.search ?? '')
      .toLowerCase()
      .trim();
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.code.toLowerCase().includes(search) ||
          r.name.toLowerCase().includes(search),
      );
    }
    const status = String(queryParams.status ?? '');
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    const sortBy = String(queryParams.sortBy);
    const sortOrder = queryParams.sortOrder === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const av = a[sortBy as keyof DemoRow];
      const bv = b[sortBy as keyof DemoRow];
      if (av === bv) return 0;
      if (av == null) return -1 * sortOrder;
      if (bv == null) return 1 * sortOrder;
      return (av > bv ? 1 : -1) * sortOrder;
    });

    const page = Number(queryParams.page);
    const limit = Number(queryParams.limit);
    const start = (page - 1) * limit;
    return {
      rows: filtered.slice(start, start + limit),
      total: filtered.length,
    };
  }, [queryParams]);

  const columns: GridColDef<DemoRow>[] = [
    { field: 'code', headerName: 'Code', width: 120 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip size="small" label={params.value} variant="outlined" />
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 140,
      valueFormatter: (value: number) => formatInr(value),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 130,
      valueFormatter: (value: string) => formatDate(value),
    },
  ];

  const rowActions: DataTableRowAction<DemoRow>[] = [
    {
      id: 'view',
      label: 'View',
      // Demo: any authenticated user; real pages pass module permissions.
      onClick: (row) => info(`View ${row.code}`),
    },
    {
      id: 'edit',
      label: 'Edit',
      permission: 'project.update',
      onClick: (row) => success(`Edit ${row.code} (if permitted)`),
    },
  ];

  const loading = simulate === 'loading';
  const error =
    simulate === 'error'
      ? {
          isAxiosError: true,
          response: {
            status: 500,
            data: {
              success: false,
              errorCode: 'INTERNAL_ERROR',
              message: 'Simulated server error for DataTable demo',
              details: [],
              requestId: 'demo-req',
              timestamp: new Date().toISOString(),
            },
          },
        }
      : undefined;

  const rows = simulate === 'empty' ? [] : pageRows.rows;
  const rowCount = simulate === 'empty' ? 0 : pageRows.total;

  return (
    <Stack spacing={2}>
      <Typography variant="h4">DataTable demo</Typography>
      <Typography color="text.secondary">
        Standard list pattern for Nest pagination (`page`, `limit`, `sortBy`,
        `sortOrder`, `search`) plus table settings (saved filters, columns,
        reset), bulk select, row actions and CSV export. Preferences use
        versioned localStorage. Not linked in the main menu — open{' '}
        <code>/dev/data-table</code> directly.
      </Typography>

      <Alert severity="info" variant="outlined">
        Example query params for a real list call:{' '}
        <code>{JSON.stringify(buildListQueryParams({
          ...list.state,
          allowedSortKeys: ALLOWED_SORT,
          filters: list.state.filters,
        }))}</code>
      </Alert>

      <FormControl size="small" sx={{ maxWidth: 220 }}>
        <InputLabel id="demo-state-label">Simulate state</InputLabel>
        <Select
          labelId="demo-state-label"
          label="Simulate state"
          value={simulate}
          onChange={(e) =>
            setSimulate(e.target.value as typeof simulate)
          }
        >
          <MenuItem value="ok">Loaded</MenuItem>
          <MenuItem value="loading">Loading</MenuItem>
          <MenuItem value="empty">Empty</MenuItem>
          <MenuItem value="error">Error</MenuItem>
        </Select>
      </FormControl>

      <DataTable
        title="Sample projects"
        rows={rows}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={() => setSimulate('ok')}
        emptyTitle="No sample rows"
        emptyDescription="Clear filters or switch simulate state back to Loaded."
        paginationMode="server"
        sortingMode="server"
        page={list.state.page}
        pageSize={list.state.limit}
        rowCount={rowCount}
        onPageChange={list.setPage}
        onPageSizeChange={list.setLimit}
        sortBy={list.state.sortBy}
        sortOrder={list.state.sortOrder}
        allowedSortKeys={ALLOWED_SORT}
        allowedFilterKeys={['status']}
        onSortChange={list.setSort}
        search={list.state.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search code or name…"
        filterValues={list.state.filters}
        preferencesKey="demo-data-table"
        onApplySavedQuery={list.applySaved}
        onResetPreferences={list.reset}
        filterSlot={
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              label="Status"
              value={list.state.filters.status ?? ''}
              onChange={(e) =>
                list.patchFilters({ status: String(e.target.value) })
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
        }
        checkboxSelection
        rowSelectionModel={selection}
        onRowSelectionModelChange={(model) => setSelection(model)}
        rowActions={rowActions}
        showExport
        exportFileName="data-table-demo"
        showColumnVisibility
        getRowId={(row) => row.id}
        height={420}
      />

      <Typography variant="body2" color="text.secondary">
        Selected: {selection.ids.size} row(s)
      </Typography>
    </Stack>
  );
}
