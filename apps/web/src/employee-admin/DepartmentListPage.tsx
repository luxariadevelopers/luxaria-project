import { useMemo } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, useListQueryState } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { canOpenDepartments } from './roleAccess';
import { DepartmentStatus, type PublicDepartment } from './types';
import { useDepartmentsList } from './useEmployees';

const SORT_KEYS = ['code', 'name', 'status'] as const;

export function DepartmentListPage() {
  const { access } = useAuth();
  const canView = canOpenDepartments(access);
  const listState = useListQueryState({
    allowedSortKeys: SORT_KEYS,
    allowedFilterKeys: [],
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
  });
  const departmentsQuery = useDepartmentsList(canView);

  const filtered = useMemo(() => {
    const search = listState.state.search.trim().toLowerCase();
    const rows = departmentsQuery.data ?? [];
    if (!search) return rows;
    return rows.filter(
      (row) =>
        row.code.toLowerCase().includes(search) ||
        row.name.toLowerCase().includes(search),
    );
  }, [departmentsQuery.data, listState.state.search]);

  const columns = useMemo<GridColDef<PublicDepartment>[]>(
    () => [
      { field: 'code', headerName: 'Code', width: 150 },
      {
        field: 'name',
        headerName: 'Department',
        minWidth: 220,
        flex: 1,
      },
      {
        field: 'description',
        headerName: 'Description',
        minWidth: 240,
        flex: 1.5,
        valueFormatter: (value: string | null) => value ?? '—',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.status}
            color={
              params.row.status === DepartmentStatus.Active
                ? 'success'
                : 'default'
            }
            variant="outlined"
          />
        ),
      },
    ],
    [],
  );

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!canView) {
    return (
      <PermissionDenied
        title="Departments unavailable"
        message="You need the department.view permission to open departments."
      />
    );
  }

  if (departmentsQuery.error && isForbiddenError(departmentsQuery.error)) {
    return (
      <PermissionDenied
        error={departmentsQuery.error}
        title="Departments denied"
        message="The server denied access to departments."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="departments-page">
      <Stack spacing={0.5}>
        <Typography variant="h5">Departments</Typography>
        <Typography variant="body2" color="text.secondary">
          Organisation departments used for employee placement.
        </Typography>
      </Stack>

      <DataTable<PublicDepartment>
        title="Departments"
        rows={filtered}
        columns={columns}
        loading={departmentsQuery.isLoading || departmentsQuery.isFetching}
        error={departmentsQuery.error}
        onRetry={() => void departmentsQuery.refetch()}
        emptyTitle="No departments"
        emptyDescription="Departments will appear after seeding or creation."
        paginationMode="client"
        sortingMode="client"
        page={listState.state.page}
        pageSize={listState.state.limit}
        rowCount={filtered.length}
        onPageChange={listState.setPage}
        onPageSizeChange={listState.setLimit}
        sortBy={listState.state.sortBy}
        sortOrder={listState.state.sortOrder}
        allowedSortKeys={SORT_KEYS}
        onSortChange={listState.setSort}
        search={listState.state.search}
        searchPlaceholder="Search code or name"
        onSearchChange={listState.setSearch}
        preferencesKey="employee-admin-departments"
        getRowId={(row) => row.id}
        height={520}
        showColumnVisibility
      />
    </Stack>
  );
}
