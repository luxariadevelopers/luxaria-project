import { useMemo } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, useListQueryState } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { PageHeader } from '@/layouts/PageHeader';
import { useUsersList } from '@/user-admin/useUsers';
import {
  canCreateEmployee,
  canOpenEmployees,
  canProvisionSiteEngineer,
} from './roleAccess';
import { EmployeeStatus, type PublicEmployee } from './types';
import {
  useDepartmentsList,
  useDesignationsList,
  useEmployeesList,
} from './useEmployees';

const EMPLOYEE_LIST_SORT_KEYS = ['createdAt', 'employeeCode', 'status'] as const;
const EMPLOYEE_LIST_FILTER_KEYS = [
  'status',
  'departmentId',
  'designationId',
] as const;

function statusColor(
  status: string,
): 'success' | 'warning' | 'error' | 'default' | 'info' {
  if (status === EmployeeStatus.Active) return 'success';
  if (status === EmployeeStatus.Suspended || status === EmployeeStatus.Terminated)
    return 'error';
  if (status === EmployeeStatus.Invited || status === EmployeeStatus.OnLeave)
    return 'info';
  if (status === EmployeeStatus.Draft) return 'warning';
  return 'default';
}

export function EmployeeListPage() {
  const { access, hasPermission } = useAuth();
  const navigate = useNavigate();
  const canView = canOpenEmployees(access);
  const listState = useListQueryState({
    allowedSortKeys: EMPLOYEE_LIST_SORT_KEYS,
    allowedFilterKeys: EMPLOYEE_LIST_FILTER_KEYS,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
  });

  const employeesQuery = useEmployeesList(
    {
      page: listState.state.page,
      limit: listState.state.limit,
      search: listState.state.search || undefined,
      status:
        (listState.state.filters.status as EmployeeStatus | undefined) ||
        undefined,
      departmentId: listState.state.filters.departmentId || undefined,
      designationId: listState.state.filters.designationId || undefined,
    },
    canView,
  );
  const departmentsQuery = useDepartmentsList(
    canView && hasPermission('department.view'),
  );
  const designationsQuery = useDesignationsList(
    canView && hasPermission('designation.view'),
  );
  const managersQuery = useUsersList(
    {
      page: 1,
      limit: 100,
      status: 'active',
      sortBy: 'fullName',
      sortOrder: 'asc',
    },
    canView && hasPermission('user.view'),
  );

  const departmentById = useMemo(
    () =>
      new Map(
        (departmentsQuery.data ?? []).map((row) => [row.id, row.name]),
      ),
    [departmentsQuery.data],
  );
  const designationById = useMemo(
    () =>
      new Map(
        (designationsQuery.data ?? []).map((row) => [row.id, row.name]),
      ),
    [designationsQuery.data],
  );
  const managerById = useMemo(
    () =>
      new Map(
        (managersQuery.data?.items ?? []).map((row) => [row.id, row.fullName]),
      ),
    [managersQuery.data?.items],
  );

  const columns = useMemo<GridColDef<PublicEmployee>[]>(
    () => [
      { field: 'employeeCode', headerName: 'Code', width: 130 },
      {
        field: 'displayName',
        headerName: 'Name',
        minWidth: 200,
        flex: 1,
      },
      {
        field: 'designationId',
        headerName: 'Designation',
        minWidth: 160,
        flex: 1,
        valueGetter: (_value, row) =>
          designationById.get(row.designationId) ?? '—',
      },
      {
        field: 'departmentId',
        headerName: 'Department',
        minWidth: 150,
        flex: 1,
        valueGetter: (_value, row) =>
          departmentById.get(row.departmentId) ?? '—',
      },
      {
        field: 'reportingManagerUserId',
        headerName: 'Manager',
        minWidth: 170,
        flex: 1,
        valueGetter: (_value, row) =>
          row.reportingManagerUserId
            ? (managerById.get(row.reportingManagerUserId) ??
              row.reportingManagerUserId)
            : '—',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.status}
            color={statusColor(params.row.status)}
            variant="outlined"
          />
        ),
      },
    ],
    [departmentById, designationById, managerById],
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
        title="Employees unavailable"
        message="You need the employee.view permission to open employee administration."
      />
    );
  }

  if (employeesQuery.error && isForbiddenError(employeesQuery.error)) {
    return (
      <PermissionDenied
        error={employeesQuery.error}
        title="Employee list denied"
        message="The server denied access to the employee register."
      />
    );
  }

  const canCreate =
    canProvisionSiteEngineer(access) || canCreateEmployee(access);

  const filterSlot = (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="employee-status-filter">Status</InputLabel>
        <Select
          labelId="employee-status-filter"
          label="Status"
          value={listState.state.filters.status ?? ''}
          onChange={(event) =>
            listState.patchFilters({ status: event.target.value })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value={EmployeeStatus.Active}>Active</MenuItem>
          <MenuItem value={EmployeeStatus.Invited}>Invited</MenuItem>
          <MenuItem value={EmployeeStatus.Suspended}>Suspended</MenuItem>
          <MenuItem value={EmployeeStatus.OnLeave}>On leave</MenuItem>
          <MenuItem value={EmployeeStatus.Relieved}>Relieved</MenuItem>
        </Select>
      </FormControl>
      {departmentsQuery.isSuccess ? (
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="employee-department-filter">Department</InputLabel>
          <Select
            labelId="employee-department-filter"
            label="Department"
            value={listState.state.filters.departmentId ?? ''}
            onChange={(event) =>
              listState.patchFilters({ departmentId: event.target.value })
            }
          >
            <MenuItem value="">All departments</MenuItem>
            {departmentsQuery.data.map((row) => (
              <MenuItem key={row.id} value={row.id}>
                {row.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
      {designationsQuery.isSuccess ? (
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="employee-designation-filter">Designation</InputLabel>
          <Select
            labelId="employee-designation-filter"
            label="Designation"
            value={listState.state.filters.designationId ?? ''}
            onChange={(event) =>
              listState.patchFilters({ designationId: event.target.value })
            }
          >
            <MenuItem value="">All designations</MenuItem>
            {designationsQuery.data.map((row) => (
              <MenuItem key={row.id} value={row.id}>
                {row.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
    </Stack>
  );

  return (
    <Stack spacing={2} data-testid="employees-page">
      <PageHeader
        title="Employees"
        subtitle="Search and administer employees, designations, and site access."
        actions={
          canCreate ? (
            <Button
              component={RouterLink}
              to="/administration/employees/new"
              variant="contained"
            >
              Create Employee
            </Button>
          ) : null
        }
      />

      <DataTable<PublicEmployee>
        title="Employee register"
        rows={employeesQuery.data?.items ?? []}
        columns={columns}
        loading={employeesQuery.isLoading || employeesQuery.isFetching}
        error={employeesQuery.error}
        onRetry={() => void employeesQuery.refetch()}
        emptyTitle="No employees"
        emptyDescription={
          canCreate
            ? 'Create the first employee or adjust the filters.'
            : 'No employees match the current filters.'
        }
        paginationMode="server"
        sortingMode="client"
        page={listState.state.page}
        pageSize={listState.state.limit}
        rowCount={employeesQuery.data?.meta?.total ?? 0}
        onPageChange={listState.setPage}
        onPageSizeChange={listState.setLimit}
        sortBy={listState.state.sortBy}
        sortOrder={listState.state.sortOrder}
        allowedSortKeys={EMPLOYEE_LIST_SORT_KEYS}
        onSortChange={listState.setSort}
        search={listState.state.search}
        searchPlaceholder="Search code, name, or email"
        onSearchChange={listState.setSearch}
        filterSlot={filterSlot}
        preferencesKey="employee-admin-register"
        allowedFilterKeys={EMPLOYEE_LIST_FILTER_KEYS}
        filterValues={listState.state.filters}
        onApplySavedQuery={listState.applySaved}
        onResetPreferences={listState.reset}
        getRowId={(row) => row.id}
        onRowClick={(params) =>
          void navigate(`/administration/employees/${params.row.id}`)
        }
        rowActions={(row) => [
          {
            id: 'view',
            label: 'View',
            permission: 'employee.view',
            onClick: () =>
              void navigate(`/administration/employees/${row.id}`),
          },
          {
            id: 'access',
            label: 'Access',
            permission: 'employee.view',
            onClick: () =>
              void navigate(`/administration/employees/${row.id}/access`),
          },
        ]}
        mobileCard={{
          primaryField: 'displayName',
          metaFields: ['employeeCode', 'designationId'],
          statusField: 'status',
        }}
        height={580}
        showColumnVisibility
      />
    </Stack>
  );
}
