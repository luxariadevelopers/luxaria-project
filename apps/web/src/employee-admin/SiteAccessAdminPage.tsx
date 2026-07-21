import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable, useListQueryState } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatDate } from '@/format';
import { useProjectsList } from '@/projects/useProjects';
import { useUsersList } from '@/user-admin/useUsers';
import { canManageSiteAccess, canOpenSiteAccess } from './roleAccess';
import {
  SiteAssignmentStatus,
  type PublicSiteAssignment,
} from './types';
import {
  useRevokeSiteAssignment,
  useSiteAssignmentsList,
  useSitesList,
} from './useEmployees';

const SORT_KEYS = ['effectiveFrom', 'status'] as const;
const FILTER_KEYS = ['status', 'projectId'] as const;

export function SiteAccessAdminPage() {
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const canView = canOpenSiteAccess(access);
  const listState = useListQueryState({
    allowedSortKeys: SORT_KEYS,
    allowedFilterKeys: FILTER_KEYS,
    defaultSortBy: 'effectiveFrom',
    defaultSortOrder: 'desc',
  });
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const assignmentsQuery = useSiteAssignmentsList(
    {
      page: listState.state.page,
      limit: listState.state.limit,
      status:
        (listState.state.filters.status as SiteAssignmentStatus | undefined) ||
        undefined,
      projectId: listState.state.filters.projectId || undefined,
    },
    canView,
  );
  const projectsQuery = useProjectsList(
    { page: 1, limit: 100, sortBy: 'projectName', sortOrder: 'asc' },
    canView && hasPermission('project.view'),
  );
  const sitesQuery = useSitesList(
    { page: 1, limit: 200 },
    canView && hasPermission('site.view'),
  );
  const usersQuery = useUsersList(
    { page: 1, limit: 100, sortBy: 'fullName', sortOrder: 'asc' },
    canView && hasPermission('user.view'),
  );
  const revokeMutation = useRevokeSiteAssignment();

  const projectById = useMemo(
    () =>
      new Map(
        (projectsQuery.data?.items ?? []).map((row) => [
          row.id,
          row.projectName,
        ]),
      ),
    [projectsQuery.data?.items],
  );
  const siteById = useMemo(
    () =>
      new Map(
        (sitesQuery.data?.items ?? []).map((row) => [
          row.id,
          `${row.siteName} (${row.siteCode})`,
        ]),
      ),
    [sitesQuery.data?.items],
  );
  const userById = useMemo(
    () =>
      new Map(
        (usersQuery.data?.items ?? []).map((row) => [row.id, row.fullName]),
      ),
    [usersQuery.data?.items],
  );

  const rows = useMemo(() => {
    const items = assignmentsQuery.data?.items ?? [];
    const search = listState.state.search.trim().toLowerCase();
    if (!search) return items;
    return items.filter((row) => {
      const user = (userById.get(row.userId) ?? row.userId).toLowerCase();
      const project = (
        projectById.get(row.projectId) ?? row.projectId
      ).toLowerCase();
      const site = (siteById.get(row.siteId) ?? row.siteId).toLowerCase();
      const role = (row.roleInSite ?? '').toLowerCase();
      return (
        user.includes(search) ||
        project.includes(search) ||
        site.includes(search) ||
        role.includes(search)
      );
    });
  }, [
    assignmentsQuery.data?.items,
    listState.state.search,
    projectById,
    siteById,
    userById,
  ]);

  const columns = useMemo<GridColDef<PublicSiteAssignment>[]>(
    () => [
      {
        field: 'userId',
        headerName: 'User',
        minWidth: 180,
        flex: 1,
        valueGetter: (_value, row) => userById.get(row.userId) ?? row.userId,
      },
      {
        field: 'projectId',
        headerName: 'Project',
        minWidth: 180,
        flex: 1,
        valueGetter: (_value, row) =>
          projectById.get(row.projectId) ?? row.projectId,
      },
      {
        field: 'siteId',
        headerName: 'Site',
        minWidth: 180,
        flex: 1,
        valueGetter: (_value, row) => siteById.get(row.siteId) ?? row.siteId,
      },
      {
        field: 'roleInSite',
        headerName: 'Role in site',
        width: 150,
        valueFormatter: (value: string | null) => value ?? '—',
      },
      {
        field: 'effectiveFrom',
        headerName: 'From',
        width: 120,
        valueFormatter: (value: string) => formatDate(value),
      },
      {
        field: 'effectiveTo',
        headerName: 'To',
        width: 120,
        valueFormatter: (value: string | null) => formatDate(value),
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
              params.row.status === SiteAssignmentStatus.Active
                ? 'success'
                : params.row.status === SiteAssignmentStatus.Expired
                  ? 'warning'
                  : 'default'
            }
            variant="outlined"
          />
        ),
      },
    ],
    [projectById, siteById, userById],
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
        title="Site access unavailable"
        message="You need the site_access.view permission to open site assignments."
      />
    );
  }

  if (assignmentsQuery.error && isForbiddenError(assignmentsQuery.error)) {
    return (
      <PermissionDenied
        error={assignmentsQuery.error}
        title="Site access denied"
        message="The server denied access to site assignments."
      />
    );
  }

  const confirmRevoke = async () => {
    if (!revokeId) return;
    try {
      await revokeMutation.mutateAsync(revokeId);
      notify.success('Site assignment revoked');
      setRevokeId(null);
    } catch (error) {
      notify.error(getErrorMessage(error, 'Revoke failed'));
      setRevokeId(null);
    }
  };

  const filterSlot = (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="site-access-status-filter">Status</InputLabel>
        <Select
          labelId="site-access-status-filter"
          label="Status"
          value={listState.state.filters.status ?? ''}
          onChange={(event) =>
            listState.patchFilters({ status: event.target.value })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value={SiteAssignmentStatus.Active}>Active</MenuItem>
          <MenuItem value={SiteAssignmentStatus.Inactive}>Inactive</MenuItem>
          <MenuItem value={SiteAssignmentStatus.Expired}>Expired</MenuItem>
        </Select>
      </FormControl>
      {projectsQuery.isSuccess ? (
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel id="site-access-project-filter">Project</InputLabel>
          <Select
            labelId="site-access-project-filter"
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
    <>
      <Stack spacing={2} data-testid="site-access-admin-page">
        <Stack spacing={0.5}>
          <Typography variant="h5">Site access</Typography>
          <Typography variant="body2" color="text.secondary">
            Review and revoke user-to-site assignments.
          </Typography>
        </Stack>

        <DataTable<PublicSiteAssignment>
          title="Site assignments"
          rows={rows}
          columns={columns}
          loading={assignmentsQuery.isLoading || assignmentsQuery.isFetching}
          error={assignmentsQuery.error}
          onRetry={() => void assignmentsQuery.refetch()}
          emptyTitle="No site assignments"
          emptyDescription="Assignments appear when users are provisioned or assigned to sites."
          paginationMode="server"
          sortingMode="client"
          page={listState.state.page}
          pageSize={listState.state.limit}
          rowCount={
            listState.state.search
              ? rows.length
              : (assignmentsQuery.data?.meta?.total ?? 0)
          }
          onPageChange={listState.setPage}
          onPageSizeChange={listState.setLimit}
          sortBy={listState.state.sortBy}
          sortOrder={listState.state.sortOrder}
          allowedSortKeys={SORT_KEYS}
          onSortChange={listState.setSort}
          search={listState.state.search}
          searchPlaceholder="Search user, project, site, or role"
          onSearchChange={listState.setSearch}
          filterSlot={filterSlot}
          preferencesKey="employee-admin-site-access"
          allowedFilterKeys={FILTER_KEYS}
          filterValues={listState.state.filters}
          onApplySavedQuery={listState.applySaved}
          onResetPreferences={listState.reset}
          getRowId={(row) => row.id}
          rowActions={(row) =>
            canManageSiteAccess(access) &&
            row.status === SiteAssignmentStatus.Active
              ? [
                  {
                    id: 'revoke',
                    label: 'Revoke',
                    permission: 'site_access.manage',
                    onClick: () => setRevokeId(row.id),
                  },
                ]
              : []
          }
          height={560}
          showColumnVisibility
        />
      </Stack>

      <ConfirmDialog
        open={Boolean(revokeId)}
        title="Revoke site assignment?"
        description="The user will lose access to this site."
        confirmLabel="Revoke"
        loading={revokeMutation.isPending}
        onCancel={() => setRevokeId(null)}
        onConfirm={() => void confirmRevoke()}
      />
    </>
  );
}
