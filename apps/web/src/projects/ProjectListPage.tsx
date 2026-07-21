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
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, useListQueryState } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { formatDate, formatInr } from '@/format';
import {
  PROJECT_LIST_FILTER_KEYS,
  PROJECT_LIST_SORT_KEYS,
  PROJECT_STAGE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  projectStageLabel,
  projectTypeLabel,
} from './constants';
import {
  useProjectCompany,
  useProjectsList,
  useProjectUserOptions,
} from './useProjects';
import type {
  ProjectStage,
  ProjectStatus,
  ProjectType,
  PublicProject,
} from './types';

function statusColor(
  status: ProjectStatus,
): 'default' | 'info' | 'warning' | 'success' | 'error' {
  if (status === 'Completed' || status === 'Closed') return 'success';
  if (status === 'Cancelled') return 'error';
  if (status === 'On Hold') return 'warning';
  if (status === 'Construction') return 'info';
  return 'default';
}

export function ProjectListPage() {
  const { user, access, hasPermission } = useAuth();
  const navigate = useNavigate();
  const canView = Boolean(access) && hasPermission('project.view');
  const canReadCompany = hasPermission('company.view');
  const companyQuery = useProjectCompany(
    user?.companyId,
    canView && (user?.companyId == null || canReadCompany),
  );
  const companyId = user?.companyId ?? companyQuery.data?.id ?? null;

  const listState = useListQueryState({
    allowedSortKeys: PROJECT_LIST_SORT_KEYS,
    allowedFilterKeys: PROJECT_LIST_FILTER_KEYS,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
  });

  const listQuery = useProjectsList(
    {
      page: listState.state.page,
      limit: listState.state.limit,
      search: listState.state.search || undefined,
      sortBy: listState.state.sortBy,
      sortOrder: listState.state.sortOrder,
      status:
        (listState.state.filters.status as ProjectStatus | undefined) ||
        undefined,
      projectType:
        (listState.state.filters.projectType as ProjectType | undefined) ||
        undefined,
      projectStage:
        (listState.state.filters.projectStage as ProjectStage | undefined) ||
        undefined,
      companyId: companyId ?? undefined,
    },
    canView && Boolean(companyId),
  );

  const usersQuery = useProjectUserOptions(
    canView && hasPermission('user.view'),
  );
  const userNameById = useMemo(
    () =>
      new Map(
        (usersQuery.data ?? []).map((option) => [
          option.id,
          option.fullName,
        ]),
      ),
    [usersQuery.data],
  );

  const columns = useMemo<GridColDef<PublicProject>[]>(
    () => [
      {
        field: 'projectCode',
        headerName: 'Code',
        width: 130,
      },
      {
        field: 'projectName',
        headerName: 'Project',
        minWidth: 220,
        flex: 1,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 150,
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
        field: 'companyId',
        headerName: 'Company',
        minWidth: 180,
        valueFormatter: (value: string | null) =>
          value === companyId
            ? companyQuery.data?.tradeName ||
              companyQuery.data?.legalName ||
              'Authenticated company'
            : value ?? '—',
      },
      {
        field: 'projectType',
        headerName: 'Type',
        width: 150,
        valueFormatter: (value: string) => projectTypeLabel(value),
      },
      {
        field: 'projectStage',
        headerName: 'Stage',
        width: 140,
        valueFormatter: (value: string) => projectStageLabel(value),
      },
      {
        field: 'startDate',
        headerName: 'Start',
        width: 125,
        valueFormatter: (value: string | null) => formatDate(value),
      },
      {
        field: 'expectedCompletionDate',
        headerName: 'Expected completion',
        width: 165,
        valueFormatter: (value: string | null) => formatDate(value),
      },
      {
        field: 'projectManager',
        headerName: 'Manager',
        minWidth: 160,
        valueFormatter: (value: string | null) =>
          value ? (userNameById.get(value) ?? value) : '—',
      },
      {
        field: 'assignedDirectors',
        headerName: 'Directors',
        minWidth: 220,
        valueFormatter: (value: string[]) =>
          value.length > 0
            ? value.map((id) => userNameById.get(id) ?? id).join(', ')
            : '—',
      },
      {
        field: 'approvedBudget',
        headerName: 'Budget',
        width: 150,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value: number | null) =>
          value == null ? '—' : formatInr(value),
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 125,
        valueFormatter: (value: string | undefined) => formatDate(value),
      },
    ],
    [companyId, companyQuery.data, userNameById],
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
        title="Projects unavailable"
        message="You need the project.view permission to open projects."
      />
    );
  }

  if (!companyId && !companyQuery.isLoading) {
    return (
      <EmptyState
        title="Company unavailable"
        description={
          companyQuery.error
            ? 'The authenticated company could not be resolved. Retry after company access is restored.'
            : 'Your account has no companyId and company.view is required to resolve /companies/primary.'
        }
        actionLabel={companyQuery.error ? 'Retry' : undefined}
        onAction={
          companyQuery.error
            ? () => void companyQuery.refetch()
            : undefined
        }
      />
    );
  }

  if (listQuery.error && isForbiddenError(listQuery.error)) {
    return (
      <PermissionDenied
        error={listQuery.error}
        title="Project list denied"
        message="The server denied access to the project list."
      />
    );
  }

  const filterSlot = (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="project-status-filter">Status</InputLabel>
        <Select
          labelId="project-status-filter"
          label="Status"
          value={listState.state.filters.status ?? ''}
          onChange={(event) =>
            listState.patchFilters({ status: event.target.value })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {PROJECT_STATUS_OPTIONS.map((option) => (
            <MenuItem key={String(option.value)} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="project-type-filter">Type</InputLabel>
        <Select
          labelId="project-type-filter"
          label="Type"
          value={listState.state.filters.projectType ?? ''}
          onChange={(event) =>
            listState.patchFilters({ projectType: event.target.value })
          }
        >
          <MenuItem value="">All types</MenuItem>
          {PROJECT_TYPE_OPTIONS.map((option) => (
            <MenuItem key={String(option.value)} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="project-stage-filter">Stage</InputLabel>
        <Select
          labelId="project-stage-filter"
          label="Stage"
          value={listState.state.filters.projectStage ?? ''}
          onChange={(event) =>
            listState.patchFilters({ projectStage: event.target.value })
          }
        >
          <MenuItem value="">All stages</MenuItem>
          {PROJECT_STAGE_OPTIONS.map((option) => (
            <MenuItem key={String(option.value)} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );

  return (
    <Stack spacing={2} data-testid="projects-list-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h5">Projects</Typography>
          <Typography variant="body2" color="text.secondary">
            Search, filter, and manage projects available to your access scope.
          </Typography>
        </Stack>
        {hasPermission('project.create') ? (
          <Button
            component={RouterLink}
            to="/projects/new"
            variant="contained"
          >
            New project
          </Button>
        ) : null}
      </Stack>

      <DataTable<PublicProject>
        title="Project register"
        rows={listQuery.data?.items ?? []}
        columns={columns}
        loading={
          companyQuery.isLoading ||
          listQuery.isLoading ||
          listQuery.isFetching
        }
        error={listQuery.error}
        onRetry={() => void listQuery.refetch()}
        emptyTitle="No projects"
        emptyDescription={
          hasPermission('project.create')
            ? 'Create the first project or adjust the filters.'
            : 'No projects are available for your access.'
        }
        paginationMode="server"
        sortingMode="server"
        page={listState.state.page}
        pageSize={listState.state.limit}
        rowCount={listQuery.data?.meta?.total ?? 0}
        onPageChange={listState.setPage}
        onPageSizeChange={listState.setLimit}
        sortBy={listState.state.sortBy}
        sortOrder={listState.state.sortOrder}
        allowedSortKeys={PROJECT_LIST_SORT_KEYS}
        onSortChange={listState.setSort}
        search={listState.state.search}
        searchPlaceholder="Search code, name, or description"
        onSearchChange={listState.setSearch}
        filterSlot={filterSlot}
        preferencesKey="projects-register"
        allowedFilterKeys={PROJECT_LIST_FILTER_KEYS}
        filterValues={listState.state.filters}
        onApplySavedQuery={listState.applySaved}
        onResetPreferences={listState.reset}
        getRowId={(row) => row.id}
        onRowClick={(params) => void navigate(`/projects/${params.row.id}`)}
        rowActions={(row) => [
          {
            id: 'view',
            label: 'View',
            permission: 'project.view',
            onClick: () => void navigate(`/projects/${row.id}`),
          },
          {
            id: 'edit',
            label: 'Edit',
            permission: 'project.update',
            onClick: () => void navigate(`/projects/${row.id}/edit`),
          },
          {
            id: 'access',
            label: 'Access',
            permission: 'project_access.view',
            onClick: () => void navigate(`/projects/${row.id}/access`),
          },
          {
            id: 'documents',
            label: 'Documents',
            permission: 'project.view',
            onClick: () => void navigate(`/projects/${row.id}/documents`),
          },
          {
            id: 'settings',
            label: 'Settings',
            permission: 'project.update',
            onClick: () => void navigate(`/projects/${row.id}/settings`),
          },
        ]}
        height={560}
        showColumnVisibility
      />
    </Stack>
  );
}
