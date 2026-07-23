import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
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
import { PageHeader } from '@/layouts/PageHeader';
import { DesignationFormDialog } from './DesignationFormDialog';
import { canManageDesignations, canOpenDesignations } from './roleAccess';
import { DesignationStatus, type PublicDesignation } from './types';
import {
  useActivateDesignation,
  useDeactivateDesignation,
  useDeleteDesignation,
  useDepartmentsList,
  useDesignationsList,
} from './useEmployees';

const SORT_KEYS = ['code', 'name', 'status'] as const;

export function DesignationListPage() {
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const canView = canOpenDesignations(access);
  const canManage = canManageDesignations(access);
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
  const activateMutation = useActivateDesignation();
  const deactivateMutation = useDeactivateDesignation();
  const deleteMutation = useDeleteDesignation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PublicDesignation | null>(null);

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

  const rowActions = useMemo<DataTableRowAction<PublicDesignation>[]>(() => {
    if (!canManage) return [];
    return [
      {
        id: 'edit',
        label: 'Edit',
        permission: 'designation.manage',
        onClick: (row) => {
          setEditing(row);
          setDialogOpen(true);
        },
      },
      {
        id: 'deactivate',
        label: 'Deactivate',
        permission: 'designation.manage',
        disabled: (row) => row.status !== DesignationStatus.Active,
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
        permission: 'designation.manage',
        disabled: (row) => row.status === DesignationStatus.Active,
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
        permission: 'designation.manage',
        danger: true,
        onClick: (row) => {
          const ok = window.confirm(
            `Delete designation "${row.name}"?\n\nAllowed only if no employees are assigned. If anyone is assigned, reassign or remove them first.`,
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
                  'Cannot delete while employees are still assigned. Reassign them first.',
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
      <PageHeader
        title="Designations"
        subtitle="Job titles linked to departments and optional default roles."
        actions={
          canManage ? (
            <Button
              variant="contained"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              Create designation
            </Button>
          ) : null
        }
      />

      {canManage ? (
        <Alert severity="info">
          Delete is blocked while any employee is still assigned to the
          designation. Reassign or remove those employees first, then delete.
        </Alert>
      ) : null}

      <DataTable<PublicDesignation>
        title="Designations"
        rows={filtered}
        columns={columns}
        loading={designationsQuery.isLoading || designationsQuery.isFetching}
        error={designationsQuery.error}
        onRetry={() => void designationsQuery.refetch()}
        emptyTitle="No designations"
        emptyDescription={
          canManage
            ? 'Create the first designation for your organisation.'
            : 'Designations will appear after seeding or creation.'
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
        searchPlaceholder="Search code, name, or role"
        onSearchChange={listState.setSearch}
        preferencesKey="employee-admin-designations"
        getRowId={(row) => row.id}
        mobileCard={{
          primaryField: 'name',
          metaFields: ['code', 'departmentId'],
          statusField: 'status',
        }}
        height={520}
        showColumnVisibility
        rowActions={rowActions}
      />

      <DesignationFormDialog
        open={dialogOpen}
        designation={editing}
        departments={departmentsQuery.data ?? []}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
      />
    </Stack>
  );
}
