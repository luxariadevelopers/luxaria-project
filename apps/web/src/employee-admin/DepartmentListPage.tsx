import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DataTable,
  type DataTableRowAction,
  useListQueryState,
} from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { DepartmentFormDialog } from './DepartmentFormDialog';
import { canManageDepartments, canOpenDepartments } from './roleAccess';
import { DepartmentStatus, type PublicDepartment } from './types';
import {
  useActivateDepartment,
  useDeactivateDepartment,
  useDeleteDepartment,
  useDepartmentsList,
} from './useEmployees';

const SORT_KEYS = ['code', 'name', 'status'] as const;

export function DepartmentListPage() {
  const { access } = useAuth();
  const notify = useNotify();
  const canView = canOpenDepartments(access);
  const canManage = canManageDepartments(access);
  const listState = useListQueryState({
    allowedSortKeys: SORT_KEYS,
    allowedFilterKeys: [],
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
  });
  const departmentsQuery = useDepartmentsList(canView);
  const activateMutation = useActivateDepartment();
  const deactivateMutation = useDeactivateDepartment();
  const deleteMutation = useDeleteDepartment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PublicDepartment | null>(null);

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

  const rowActions = useMemo<DataTableRowAction<PublicDepartment>[]>(() => {
    if (!canManage) return [];
    return [
      {
        id: 'edit',
        label: 'Edit',
        permission: 'department.manage',
        onClick: (row) => {
          setEditing(row);
          setDialogOpen(true);
        },
      },
      {
        id: 'deactivate',
        label: 'Deactivate',
        permission: 'department.manage',
        danger: true,
        disabled: (row) => row.status !== DepartmentStatus.Active,
        onClick: (row) => {
          void (async () => {
            try {
              await deactivateMutation.mutateAsync(row.id);
              notify.success(`${row.name} deactivated`);
            } catch (err) {
              notify.error(getErrorMessage(err, 'Could not deactivate'));
            }
          })();
        },
      },
      {
        id: 'activate',
        label: 'Activate',
        permission: 'department.manage',
        disabled: (row) => row.status === DepartmentStatus.Active,
        onClick: (row) => {
          void (async () => {
            try {
              await activateMutation.mutateAsync(row.id);
              notify.success(`${row.name} activated`);
            } catch (err) {
              notify.error(getErrorMessage(err, 'Could not activate'));
            }
          })();
        },
      },
      {
        id: 'delete',
        label: 'Delete',
        permission: 'department.manage',
        danger: true,
        onClick: (row) => {
          const ok = window.confirm(
            `Delete department "${row.name}"?\n\nAllowed only if no employees and no designations are linked. Reassign/remove employees and move/delete designations first.`,
          );
          if (!ok) return;
          void (async () => {
            try {
              await deleteMutation.mutateAsync(row.id);
              notify.success(`${row.name} deleted`);
            } catch (err) {
              notify.error(
                getErrorMessage(
                  err,
                  'Cannot delete while employees or designations are still linked. Reassign them first.',
                ),
              );
            }
          })();
        },
      },
    ];
  }, [
    activateMutation,
    canManage,
    deactivateMutation,
    deleteMutation,
    notify,
  ]);

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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h5">Departments</Typography>
          <Typography variant="body2" color="text.secondary">
            Organisation departments used for employee placement.
          </Typography>
        </Stack>
        {canManage ? (
          <Button
            variant="contained"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Create department
          </Button>
        ) : null}
      </Stack>

      {canManage ? (
        <Alert severity="info">
          Delete is blocked while any employee is assigned to the department, or
          any designation is linked to it. Reassign/remove those employees and
          move/delete those designations first, then delete.
        </Alert>
      ) : null}

      <DataTable<PublicDepartment>
        title="Departments"
        rows={filtered}
        columns={columns}
        loading={departmentsQuery.isLoading || departmentsQuery.isFetching}
        error={departmentsQuery.error}
        onRetry={() => void departmentsQuery.refetch()}
        emptyTitle="No departments"
        emptyDescription={
          canManage
            ? 'Create the first department for your organisation.'
            : 'Departments will appear after seeding or creation.'
        }
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
        rowActions={rowActions}
      />

      <DepartmentFormDialog
        open={dialogOpen}
        department={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
      />
    </Stack>
  );
}
