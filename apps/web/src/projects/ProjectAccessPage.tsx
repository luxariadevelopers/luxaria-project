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
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DEFAULT_LIST_PAGE_SIZE,
  DataTable,
  type DataTableRowAction,
} from '@/components/data-table';
import { DetailHeader } from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatDate } from '@/format';
import { ProjectAssignmentDialog } from './ProjectAssignmentDialog';
import {
  useActivateProjectAssignment,
  useCreateProjectAssignment,
  useDeactivateProjectAssignment,
  useProjectAssignments,
  useProjectDetail,
  useProjectUserOptions,
  useUpdateProjectAssignment,
} from './useProjects';
import {
  ProjectAccessStatus,
  type PublicProjectAssignment,
} from './types';
import {
  toCreateAssignmentInput,
  toUpdateAssignmentInput,
  type ProjectAssignmentFormValues,
} from './validation';

type Props = {
  projectId?: string;
};

export function ProjectAccessPage({
  projectId: projectIdProp,
}: Props = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PublicProjectAssignment | null>(null);
  const [serverError, setServerError] = useState<unknown>();

  const canView = Boolean(access) && hasPermission('project_access.view');
  const assignmentsQuery = useProjectAssignments(
    { projectId, page, limit: pageSize, sortBy: 'createdAt', sortOrder: 'desc' },
    canView && Boolean(projectId),
  );
  const projectQuery = useProjectDetail(
    projectId,
    canView && hasPermission('project.view'),
  );
  const usersQuery = useProjectUserOptions(
    canView && hasPermission('user.view'),
  );
  const createMutation = useCreateProjectAssignment();
  const updateMutation = useUpdateProjectAssignment();
  const activateMutation = useActivateProjectAssignment();
  const deactivateMutation = useDeactivateProjectAssignment();

  const userNameById = useMemo(
    () =>
      new Map(
        (usersQuery.data ?? []).map((user) => [
          user.id,
          `${user.fullName} · ${user.userCode}`,
        ]),
      ),
    [usersQuery.data],
  );

  const columns = useMemo<GridColDef<PublicProjectAssignment>[]>(
    () => [
      {
        field: 'userId',
        headerName: 'User',
        minWidth: 220,
        flex: 1,
        valueFormatter: (value: string) => userNameById.get(value) ?? value,
      },
      {
        field: 'accessStartDate',
        headerName: 'Starts',
        width: 130,
        valueFormatter: (value: string) => formatDate(value),
      },
      {
        field: 'accessEndDate',
        headerName: 'Ends',
        width: 130,
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
              params.row.status === ProjectAccessStatus.Active
                ? 'success'
                : params.row.status === ProjectAccessStatus.Expired
                  ? 'warning'
                  : 'default'
            }
            variant="outlined"
          />
        ),
      },
      {
        field: 'notes',
        headerName: 'Notes',
        minWidth: 220,
        flex: 1,
        valueFormatter: (value: string | null) => value ?? '—',
      },
    ],
    [userNameById],
  );

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !canView ||
    (assignmentsQuery.error && isForbiddenError(assignmentsQuery.error))
  ) {
    return (
      <PermissionDenied
        error={assignmentsQuery.error}
        title="Project access unavailable"
        message="You need project_access.view to list explicit assignments."
      />
    );
  }

  const handleSave = async (values: ProjectAssignmentFormValues) => {
    if (!projectId) return;
    setServerError(undefined);
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          input: toUpdateAssignmentInput(values),
        });
        notify.success('Project access updated');
      } else {
        await createMutation.mutateAsync(
          toCreateAssignmentInput(values, projectId),
        );
        notify.success('Project access assigned');
      }
      setEditorOpen(false);
      setEditing(null);
    } catch (error) {
      setServerError(error);
    }
  };

  const actions = (
    row: PublicProjectAssignment,
  ): DataTableRowAction<PublicProjectAssignment>[] => [
    {
      id: 'edit',
      label: 'Edit dates and status',
      permission: 'project_access.manage',
      onClick: () => {
        setEditing(row);
        setServerError(undefined);
        setEditorOpen(true);
      },
    },
    ...(row.status === ProjectAccessStatus.Active
      ? [
          {
            id: 'deactivate',
            label: 'Deactivate',
            permission: 'project_access.manage',
            danger: true,
            onClick: async () => {
              try {
                await deactivateMutation.mutateAsync(row.id);
                notify.success('Project access deactivated');
              } catch (error) {
                notify.error(getErrorMessage(error));
              }
            },
          } satisfies DataTableRowAction<PublicProjectAssignment>,
        ]
      : [
          {
            id: 'activate',
            label: 'Activate',
            permission: 'project_access.manage',
            onClick: async () => {
              try {
                await activateMutation.mutateAsync(row.id);
                notify.success('Project access activated');
              } catch (error) {
                notify.error(getErrorMessage(error));
              }
            },
          } satisfies DataTableRowAction<PublicProjectAssignment>,
        ]),
  ];

  return (
    <Stack spacing={2.5} data-testid="project-access-page">
      <DetailHeader
        title={`${projectQuery.data?.projectName ?? 'Project'} access`}
        code={projectQuery.data?.projectCode ?? projectId}
        subtitle="Explicit user assignments with effective dates and activation state."
        backTo={projectId ? `/projects/${projectId}` : '/projects'}
        backLabel="Project"
      />

      {hasPermission('project_access.assign') &&
      (!hasPermission('user.view') || usersQuery.error) ? (
        <Alert severity="info">
          New assignment is hidden because selecting a real user requires the
          optional /users lookup and user.view.
        </Alert>
      ) : null}

      <DataTable<PublicProjectAssignment>
        title="Project assignments"
        rows={assignmentsQuery.data?.items ?? []}
        columns={columns}
        loading={assignmentsQuery.isLoading || assignmentsQuery.isFetching}
        error={assignmentsQuery.error}
        onRetry={() => void assignmentsQuery.refetch()}
        emptyTitle="No explicit assignments"
        emptyDescription="No users currently have an explicit assignment to this project."
        paginationMode="server"
        page={page}
        pageSize={pageSize}
        rowCount={assignmentsQuery.data?.meta?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
        getRowId={(row) => row.id}
        rowActions={actions}
        toolbarActions={
          hasPermission('project_access.assign') && usersQuery.isSuccess ? (
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setEditing(null);
                setServerError(undefined);
                setEditorOpen(true);
              }}
            >
              Assign user
            </Button>
          ) : undefined
        }
        height={480}
        preferencesKey="project-access-assignments"
      />

      <ProjectAssignmentDialog
        open={editorOpen}
        assignment={editing}
        users={usersQuery.data ?? []}
        loading={createMutation.isPending || updateMutation.isPending}
        serverError={serverError}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
          setServerError(undefined);
        }}
        onSubmit={handleSave}
      />
    </Stack>
  );
}
