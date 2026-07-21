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
import { canOpenDesignations } from './roleAccess';
import { DesignationStatus, type PublicDesignation } from './types';
import { useDepartmentsList, useDesignationsList } from './useEmployees';

const SORT_KEYS = ['code', 'name', 'status'] as const;

export function DesignationListPage() {
  const { access, hasPermission } = useAuth();
  const canView = canOpenDesignations(access);
  const listState = useListQueryState({
    allowedSortKeys: SORT_KEYS,
    allowedFilterKeys: [],
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
  });
  const designationsQuery = useDesignationsList(canView);
  const departmentsQuery = useDepartmentsList(
    canView && hasPermission('department.view'),
  );

  const departmentById = useMemo(
    () =>
      new Map((departmentsQuery.data ?? []).map((row) => [row.id, row.name])),
    [departmentsQuery.data],
  );

  const filtered = useMemo(() => {
    const search = listState.state.search.trim().toLowerCase();
    const rows = designationsQuery.data ?? [];
    if (!search) return rows;
    return rows.filter(
      (row) =>
        row.code.toLowerCase().includes(search) ||
        row.name.toLowerCase().includes(search) ||
        (row.defaultRoleCode ?? '').toLowerCase().includes(search),
    );
  }, [designationsQuery.data, listState.state.search]);

  const columns = useMemo<GridColDef<PublicDesignation>[]>(
    () => [
      { field: 'code', headerName: 'Code', width: 160 },
      {
        field: 'name',
        headerName: 'Designation',
        minWidth: 200,
        flex: 1,
      },
      {
        field: 'departmentId',
        headerName: 'Department',
        minWidth: 160,
        flex: 1,
        valueGetter: (_value, row) =>
          row.departmentId
            ? (departmentById.get(row.departmentId) ?? row.departmentId)
            : '—',
      },
      {
        field: 'defaultRoleCode',
        headerName: 'Default role',
        width: 160,
        valueFormatter: (value: string | null) => value ?? '—',
      },
      {
        field: 'mobileEligible',
        headerName: 'Mobile',
        width: 100,
        valueFormatter: (value: boolean) => (value ? 'Yes' : 'No'),
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
              params.row.status === DesignationStatus.Active
                ? 'success'
                : 'default'
            }
            variant="outlined"
          />
        ),
      },
    ],
    [departmentById],
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
        title="Designations unavailable"
        message="You need the designation.view permission to open designations."
      />
    );
  }

  if (designationsQuery.error && isForbiddenError(designationsQuery.error)) {
    return (
      <PermissionDenied
        error={designationsQuery.error}
        title="Designations denied"
        message="The server denied access to designations."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="designations-page">
      <Stack spacing={0.5}>
        <Typography variant="h5">Designations</Typography>
        <Typography variant="body2" color="text.secondary">
          Job titles linked to departments and optional default roles.
        </Typography>
      </Stack>

      <DataTable<PublicDesignation>
        title="Designations"
        rows={filtered}
        columns={columns}
        loading={designationsQuery.isLoading || designationsQuery.isFetching}
        error={designationsQuery.error}
        onRetry={() => void designationsQuery.refetch()}
        emptyTitle="No designations"
        emptyDescription="Designations will appear after seeding or creation."
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
        searchPlaceholder="Search code, name, or role"
        onSearchChange={listState.setSearch}
        preferencesKey="employee-admin-designations"
        getRowId={(row) => row.id}
        height={520}
        showColumnVisibility
      />
    </Stack>
  );
}
