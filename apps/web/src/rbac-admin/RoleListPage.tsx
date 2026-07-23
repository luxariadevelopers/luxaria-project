import { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, useListQueryState } from '@/components/data-table';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDateTime } from '@/format';
import { PageHeader } from '@/layouts/PageHeader';
import {
  canCreateRole,
  canEditRole,
  canOpenRoles,
} from './roleAccess';
import { RoleStatus, type PublicRole } from './types';
import { useEffectiveUserAccess, useRolesList } from './useRbac';

const ROLE_LIST_SORT_KEYS = [
  'createdAt',
  'updatedAt',
  'name',
  'code',
  'status',
] as const;

const ROLE_LIST_FILTER_KEYS = ['status'] as const;

function EffectiveAccessPanel() {
  const accessQuery = useEffectiveUserAccess();

  if (accessQuery.error) {
    return (
      <RetryPanel
        error={accessQuery.error}
        onRetry={() => void accessQuery.refetch()}
        forceRetry
      />
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.25}>
          <Typography variant="h6">Your effective access</Typography>
          <Typography variant="body2" color="text.secondary">
            Live result from GET /rbac/me/permissions.
          </Typography>
        </Stack>
        {accessQuery.isLoading ? (
          <Typography color="text.secondary">
            Loading effective permissions…
          </Typography>
        ) : accessQuery.data ? (
          <>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: 'wrap' }}
            >
              {accessQuery.data.roleCodes.length === 0 ? (
                <Typography color="text.secondary">
                  No active roles
                </Typography>
              ) : (
                accessQuery.data.roleCodes.map((code) => (
                  <Chip key={code} label={code} size="small" />
                ))
              )}
              {accessQuery.data.bypassPermissions ? (
                <Chip
                  label="Permission bypass"
                  size="small"
                  color="warning"
                />
              ) : null}
            </Stack>
            <Typography variant="body2">
              {accessQuery.data.permissions.length} effective catalog
              permissions
            </Typography>
          </>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function RoleListPage() {
  const { access } = useAuth();
  const navigate = useNavigate();
  const canView = canOpenRoles(access);
  const listState = useListQueryState({
    allowedSortKeys: ROLE_LIST_SORT_KEYS,
    allowedFilterKeys: ROLE_LIST_FILTER_KEYS,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
  });
  const rolesQuery = useRolesList(
    {
      page: listState.state.page,
      limit: listState.state.limit,
      search: listState.state.search || undefined,
      sortBy: listState.state.sortBy,
      sortOrder: listState.state.sortOrder,
      status:
        (listState.state.filters.status as RoleStatus | undefined) ||
        undefined,
    },
    canView,
  );

  const columns = useMemo<GridColDef<PublicRole>[]>(
    () => [
      {
        field: 'code',
        headerName: 'Code',
        minWidth: 190,
        flex: 1,
      },
      {
        field: 'name',
        headerName: 'Role',
        minWidth: 200,
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
              params.row.status === RoleStatus.Active
                ? 'success'
                : 'default'
            }
            variant="outlined"
          />
        ),
      },
      {
        field: 'permissions',
        headerName: 'Permissions',
        width: 125,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value: string[]) => value.length,
      },
      {
        field: 'isSystem',
        headerName: 'Type',
        width: 105,
        valueFormatter: (value: boolean) =>
          value ? 'System' : 'Custom',
      },
      {
        field: 'bypassPermissions',
        headerName: 'Bypass',
        width: 100,
        valueFormatter: (value: boolean) => (value ? 'Yes' : 'No'),
      },
      {
        field: 'updatedAt',
        headerName: 'Updated',
        width: 180,
        valueFormatter: (value: string | undefined) =>
          formatDateTime(value),
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
        title="Roles unavailable"
        message="You need role.view to open RBAC administration."
      />
    );
  }

  if (rolesQuery.error && isForbiddenError(rolesQuery.error)) {
    return (
      <PermissionDenied
        error={rolesQuery.error}
        title="Role list denied"
        message="The server denied access to the role register."
      />
    );
  }

  const filterSlot = (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <InputLabel id="role-status-filter">Status</InputLabel>
      <Select
        labelId="role-status-filter"
        label="Status"
        value={listState.state.filters.status ?? ''}
        onChange={(event) =>
          listState.patchFilters({ status: event.target.value })
        }
      >
        <MenuItem value="">All statuses</MenuItem>
        <MenuItem value={RoleStatus.Active}>Active</MenuItem>
        <MenuItem value={RoleStatus.Inactive}>Inactive</MenuItem>
      </Select>
    </FormControl>
  );

  return (
    <Stack spacing={2} data-testid="roles-list-page">
      <PageHeader
        title="Roles and permissions"
        subtitle="Manage canonical permission sets and user role assignment."
        actions={
          canCreateRole(access) ? (
            <Button
              component={RouterLink}
              to="/administration/roles/new"
              variant="contained"
            >
              New role
            </Button>
          ) : null
        }
      />

      <EffectiveAccessPanel />

      {rolesQuery.data?.items.some((role) => role.bypassPermissions) ? (
        <Alert severity="warning">
          Bypass roles grant every permission. Review changes to them with
          elevated care.
        </Alert>
      ) : null}

      <DataTable<PublicRole>
        title="Role register"
        rows={rolesQuery.data?.items ?? []}
        columns={columns}
        loading={rolesQuery.isLoading || rolesQuery.isFetching}
        error={rolesQuery.error}
        onRetry={() => void rolesQuery.refetch()}
        emptyTitle="No roles"
        emptyDescription={
          canCreateRole(access)
            ? 'Create the first role or adjust the filters.'
            : 'No roles match the current filters.'
        }
        paginationMode="server"
        sortingMode="server"
        page={listState.state.page}
        pageSize={listState.state.limit}
        rowCount={rolesQuery.data?.meta?.total ?? 0}
        onPageChange={listState.setPage}
        onPageSizeChange={listState.setLimit}
        sortBy={listState.state.sortBy}
        sortOrder={listState.state.sortOrder}
        allowedSortKeys={ROLE_LIST_SORT_KEYS}
        onSortChange={listState.setSort}
        search={listState.state.search}
        searchPlaceholder="Search role code, name, or description"
        onSearchChange={listState.setSearch}
        filterSlot={filterSlot}
        preferencesKey="rbac-role-register"
        allowedFilterKeys={ROLE_LIST_FILTER_KEYS}
        filterValues={listState.state.filters}
        onApplySavedQuery={listState.applySaved}
        onResetPreferences={listState.reset}
        getRowId={(row) => row.id}
        onRowClick={(params) =>
          void navigate(`/administration/roles/${params.row.id}`)
        }
        rowActions={(row) => [
          {
            id: 'view',
            label: 'View',
            permission: 'role.view',
            onClick: () =>
              void navigate(`/administration/roles/${row.id}`),
          },
          ...(canEditRole(access)
            ? [
                {
                  id: 'edit',
                  label: 'Edit',
                  permission: 'role.update',
                  onClick: () =>
                    void navigate(
                      `/administration/roles/${row.id}/edit`,
                    ),
                },
              ]
            : []),
        ]}
        mobileCard={{
          primaryField: 'name',
          metaFields: ['code', 'description'],
          statusField: 'status',
        }}
        height={540}
        showColumnVisibility
      />
    </Stack>
  );
}
