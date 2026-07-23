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
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, useListQueryState } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { formatDate, formatDateTime } from '@/format';
import { PageHeader } from '@/layouts/PageHeader';
import { useProjectsList } from '@/projects/useProjects';
import { useRolesList } from '@/rbac-admin/useRbac';
import {
  canCreateUser,
  canEditUser,
  canOpenUsers,
} from './roleAccess';
import { UserStatus, type PublicUser } from './types';
import { useUsersList } from './useUsers';

const USER_LIST_SORT_KEYS = [
  'createdAt',
  'updatedAt',
  'fullName',
  'email',
  'department',
  'status',
  'joiningDate',
  'lastLoginAt',
  'userCode',
] as const;

const USER_LIST_FILTER_KEYS = [
  'status',
  'department',
  'roleId',
  'projectId',
] as const;

function statusColor(
  status: string,
): 'success' | 'warning' | 'error' | 'default' {
  if (status === UserStatus.Active) return 'success';
  if (status === UserStatus.Locked) return 'error';
  if (status === UserStatus.Inactive) return 'warning';
  return 'default';
}

export function UserListPage() {
  const { access, hasPermission } = useAuth();
  const navigate = useNavigate();
  const canView = canOpenUsers(access);
  const listState = useListQueryState({
    allowedSortKeys: USER_LIST_SORT_KEYS,
    allowedFilterKeys: USER_LIST_FILTER_KEYS,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
  });

  const usersQuery = useUsersList(
    {
      page: listState.state.page,
      limit: listState.state.limit,
      search: listState.state.search || undefined,
      sortBy: listState.state.sortBy,
      sortOrder: listState.state.sortOrder,
      status:
        (listState.state.filters.status as UserStatus | undefined) ||
        undefined,
      department: listState.state.filters.department || undefined,
      roleId: listState.state.filters.roleId || undefined,
      projectId: listState.state.filters.projectId || undefined,
    },
    canView,
  );
  const rolesQuery = useRolesList(
    { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' },
    canView && hasPermission('role.view'),
  );
  const projectsQuery = useProjectsList(
    { page: 1, limit: 100, sortBy: 'projectName', sortOrder: 'asc' },
    canView && hasPermission('project.view'),
  );

  const roleById = useMemo(
    () =>
      new Map(
        (rolesQuery.data?.items ?? []).map((role) => [role.id, role.name]),
      ),
    [rolesQuery.data?.items],
  );

  const columns = useMemo<GridColDef<PublicUser>[]>(
    () => [
      { field: 'userCode', headerName: 'Code', width: 130 },
      {
        field: 'fullName',
        headerName: 'User',
        minWidth: 210,
        flex: 1,
      },
      {
        field: 'email',
        headerName: 'Email',
        minWidth: 220,
        flex: 1,
        valueFormatter: (value: string | null) => value ?? '—',
      },
      {
        field: 'mobile',
        headerName: 'Mobile',
        width: 145,
        valueFormatter: (value: string | null) => value ?? '—',
      },
      {
        field: 'department',
        headerName: 'Department',
        width: 160,
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
            color={statusColor(params.row.status)}
            variant="outlined"
          />
        ),
      },
      {
        field: 'roleIds',
        headerName: 'Roles',
        minWidth: 190,
        valueFormatter: (value: string[]) =>
          value.length > 0
            ? value.map((id) => roleById.get(id) ?? id).join(', ')
            : '—',
      },
      {
        field: 'assignedProjects',
        headerName: 'Projects',
        width: 110,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value: string[]) => value.length,
      },
      {
        field: 'lastLoginAt',
        headerName: 'Last login',
        width: 180,
        valueFormatter: (value: string | null) => formatDateTime(value),
      },
      {
        field: 'joiningDate',
        headerName: 'Joined',
        width: 125,
        valueFormatter: (value: string | null) => formatDate(value),
      },
    ],
    [roleById],
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
        title="Users unavailable"
        message="You need the user.view permission to open user administration."
      />
    );
  }

  if (usersQuery.error && isForbiddenError(usersQuery.error)) {
    return (
      <PermissionDenied
        error={usersQuery.error}
        title="User list denied"
        message="The server denied access to the user register."
      />
    );
  }

  const filterSlot = (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="user-status-filter">Status</InputLabel>
        <Select
          labelId="user-status-filter"
          label="Status"
          value={listState.state.filters.status ?? ''}
          onChange={(event) =>
            listState.patchFilters({ status: event.target.value })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value={UserStatus.Active}>Active</MenuItem>
          <MenuItem value={UserStatus.Inactive}>Inactive</MenuItem>
          <MenuItem value={UserStatus.Locked}>Locked</MenuItem>
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Department"
        value={listState.state.filters.department ?? ''}
        onChange={(event) =>
          listState.patchFilters({ department: event.target.value })
        }
        sx={{ minWidth: 160 }}
      />
      {rolesQuery.isSuccess ? (
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel id="user-role-filter">Role</InputLabel>
          <Select
            labelId="user-role-filter"
            label="Role"
            value={listState.state.filters.roleId ?? ''}
            onChange={(event) =>
              listState.patchFilters({ roleId: event.target.value })
            }
          >
            <MenuItem value="">All roles</MenuItem>
            {rolesQuery.data.items.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
      {projectsQuery.isSuccess ? (
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel id="user-project-filter">Project</InputLabel>
          <Select
            labelId="user-project-filter"
            label="Project"
            value={listState.state.filters.projectId ?? ''}
            onChange={(event) =>
              listState.patchFilters({ projectId: event.target.value })
            }
          >
            <MenuItem value="">All projects</MenuItem>
            {projectsQuery.data.items.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.projectName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
    </Stack>
  );

  return (
    <Stack spacing={2} data-testid="users-list-page">
      <PageHeader
        title="Users"
        subtitle="Search, filter, and administer staff accounts and access."
        actions={
          canCreateUser(access) ? (
            <Button component={RouterLink} to="/users/new" variant="contained">
              New user
            </Button>
          ) : null
        }
      />

      {rolesQuery.error && hasPermission('role.view') ? (
        <Alert severity="info">
          Role names and the role filter are unavailable; stored role IDs
          remain visible.
        </Alert>
      ) : null}
      {projectsQuery.error && hasPermission('project.view') ? (
        <Alert severity="info">
          The optional project filter is unavailable.
        </Alert>
      ) : null}

      <DataTable<PublicUser>
        title="User register"
        rows={usersQuery.data?.items ?? []}
        columns={columns}
        loading={usersQuery.isLoading || usersQuery.isFetching}
        error={usersQuery.error}
        onRetry={() => void usersQuery.refetch()}
        emptyTitle="No users"
        emptyDescription={
          canCreateUser(access)
            ? 'Create the first user or adjust the filters.'
            : 'No users match the current filters.'
        }
        paginationMode="server"
        sortingMode="server"
        page={listState.state.page}
        pageSize={listState.state.limit}
        rowCount={usersQuery.data?.meta?.total ?? 0}
        onPageChange={listState.setPage}
        onPageSizeChange={listState.setLimit}
        sortBy={listState.state.sortBy}
        sortOrder={listState.state.sortOrder}
        allowedSortKeys={USER_LIST_SORT_KEYS}
        onSortChange={listState.setSort}
        search={listState.state.search}
        searchPlaceholder="Search code, name, email, mobile, or employee ID"
        onSearchChange={listState.setSearch}
        filterSlot={filterSlot}
        preferencesKey="user-admin-register"
        allowedFilterKeys={USER_LIST_FILTER_KEYS}
        filterValues={listState.state.filters}
        onApplySavedQuery={listState.applySaved}
        onResetPreferences={listState.reset}
        getRowId={(row) => row.id}
        onRowClick={(params) => void navigate(`/users/${params.row.id}`)}
        rowActions={(row) => [
          {
            id: 'view',
            label: 'View',
            permission: 'user.view',
            onClick: () => void navigate(`/users/${row.id}`),
          },
          ...(canEditUser(access)
            ? [
                {
                  id: 'edit',
                  label: 'Edit',
                  permission: 'user.update',
                  onClick: () => void navigate(`/users/${row.id}/edit`),
                },
              ]
            : []),
        ]}
        mobileCard={{
          primaryField: 'fullName',
          metaFields: ['userCode', 'email'],
          statusField: 'status',
        }}
        height={580}
        showColumnVisibility
      />
    </Stack>
  );
}
