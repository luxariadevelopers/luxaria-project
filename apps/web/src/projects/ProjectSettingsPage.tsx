import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailHeader } from '@/components/entity-detail';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import {
  PROJECT_STATUS_OPTIONS,
  PROJECT_STATUS_TRANSITIONS,
} from './constants';
import {
  useAssignProjectDirectors,
  useAssignProjectManager,
  useProjectDetail,
  useProjectUserOptions,
  useUpdateProjectStatus,
} from './useProjects';
import { ProjectStatus } from './types';

type Props = {
  projectId?: string;
};

export function ProjectSettingsPage({
  projectId: projectIdProp,
}: Props = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const canUpdate =
    Boolean(access) &&
    hasPermission('project.view') &&
    hasPermission('project.update');
  const detailQuery = useProjectDetail(projectId, canUpdate);
  const usersQuery = useProjectUserOptions(
    canUpdate && hasPermission('user.view'),
  );
  const statusMutation = useUpdateProjectStatus(projectId ?? '');
  const managerMutation = useAssignProjectManager(projectId ?? '');
  const directorsMutation = useAssignProjectDirectors(projectId ?? '');

  const project = detailQuery.data;
  const [nextStatus, setNextStatus] = useState<ProjectStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [actualCompletionDate, setActualCompletionDate] = useState('');
  const [managerId, setManagerId] = useState('');
  const [directorIds, setDirectorIds] = useState<string[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (!project) return;
    setManagerId(project.projectManager ?? '');
    setDirectorIds(project.assignedDirectors);
    setActualCompletionDate(
      project.actualCompletionDate?.slice(0, 10) ?? '',
    );
    setNextStatus('');
  }, [project]);

  const allowedStatuses = useMemo(() => {
    if (!project) return [];
    return PROJECT_STATUS_TRANSITIONS[project.status].filter(
      (status) =>
        (status !== ProjectStatus.Closed &&
          status !== ProjectStatus.Cancelled) ||
        hasPermission('project.close'),
    );
  }, [project, hasPermission]);

  if (!access || (canUpdate && detailQuery.isLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !canUpdate ||
    (detailQuery.error && isForbiddenError(detailQuery.error))
  ) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Project settings unavailable"
        message="You need project.view, project.update, and explicit project access."
      />
    );
  }

  if (detailQuery.error || !project) {
    return (
      <RetryPanel
        error={detailQuery.error ?? new Error('Project not found')}
        onRetry={() => void detailQuery.refetch()}
        forceRetry
      />
    );
  }

  const submitStatus = async () => {
    if (!nextStatus) return;
    if (
      nextStatus === ProjectStatus.Completed &&
      actualCompletionDate &&
      project.startDate &&
      actualCompletionDate < project.startDate.slice(0, 10)
    ) {
      notify.error('Actual completion must be on or after the start date');
      return;
    }
    try {
      await statusMutation.mutateAsync({
        status: nextStatus,
        actualCompletionDate:
          nextStatus === ProjectStatus.Completed
            ? actualCompletionDate || undefined
            : undefined,
        note: statusNote.trim() || undefined,
      });
      setConfirmClose(false);
      setStatusNote('');
      notify.success(`Project status changed to ${nextStatus}`);
    } catch (error) {
      setConfirmClose(false);
      notify.error(getErrorMessage(error));
    }
  };

  const statusLabel = (status: ProjectStatus) =>
    PROJECT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status;

  return (
    <Stack spacing={2.5} data-testid="project-settings-page">
      <DetailHeader
        title={`${project.projectName} settings`}
        code={project.projectCode}
        backTo={`/projects/${project.id}`}
        backLabel="Project"
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6">Status</Typography>
            <Typography variant="body2" color="text.secondary">
              Current status: {project.status}. Only backend-supported
              transitions are shown.
            </Typography>
          </Stack>
          {allowedStatuses.length === 0 ? (
            <Alert severity="info">
              No status transitions are available for this project and your
              permissions.
            </Alert>
          ) : (
            <>
              <FormControl fullWidth>
                <InputLabel id="project-next-status">
                  New status
                </InputLabel>
                <Select
                  labelId="project-next-status"
                  label="New status"
                  value={nextStatus}
                  onChange={(event) =>
                    setNextStatus(event.target.value as ProjectStatus)
                  }
                >
                  {allowedStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {statusLabel(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {nextStatus === ProjectStatus.Completed ? (
                <TextField
                  type="date"
                  label="Actual completion date"
                  value={actualCompletionDate}
                  onChange={(event) =>
                    setActualCompletionDate(event.target.value)
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              ) : null}
              <TextField
                label="Status note"
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
              <Button
                variant="contained"
                disabled={!nextStatus || statusMutation.isPending}
                onClick={() => {
                  if (
                    nextStatus === ProjectStatus.Closed ||
                    nextStatus === ProjectStatus.Cancelled
                  ) {
                    setConfirmClose(true);
                  } else {
                    void submitStatus();
                  }
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                Update status
              </Button>
            </>
          )}
        </Stack>
      </Paper>

      {usersQuery.error || !hasPermission('user.view') ? (
        <Alert severity="info">
          Manager and director selectors are hidden because the optional
          /users lookup is unavailable.
        </Alert>
      ) : usersQuery.isLoading ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography color="text.secondary">
            Loading assignment options…
          </Typography>
        </Paper>
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Project manager</Typography>
              <FormControl fullWidth>
                <InputLabel id="project-manager-setting">
                  Project manager
                </InputLabel>
                <Select
                  labelId="project-manager-setting"
                  label="Project manager"
                  value={managerId}
                  onChange={(event) => setManagerId(event.target.value)}
                >
                  {project.projectManager &&
                  !usersQuery.data?.some(
                    (user) => user.id === project.projectManager,
                  ) ? (
                    <MenuItem value={project.projectManager}>
                      Current manager · {project.projectManager}
                    </MenuItem>
                  ) : null}
                  {usersQuery.data?.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.fullName} · {user.userCode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                The current API supports assigning a manager, but not clearing
                the manager.
              </Typography>
              <Button
                variant="contained"
                disabled={!managerId || managerMutation.isPending}
                onClick={async () => {
                  try {
                    await managerMutation.mutateAsync(managerId);
                    notify.success('Project manager assigned');
                  } catch (error) {
                    notify.error(getErrorMessage(error));
                  }
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                Save manager
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Assigned directors</Typography>
              <FormControl fullWidth>
                <InputLabel id="project-directors-setting">
                  Directors
                </InputLabel>
                <Select
                  multiple
                  labelId="project-directors-setting"
                  label="Directors"
                  value={directorIds}
                  onChange={(event) =>
                    setDirectorIds(
                      typeof event.target.value === 'string'
                        ? event.target.value.split(',')
                        : event.target.value,
                    )
                  }
                >
                  {directorIds
                    .filter(
                      (id) =>
                        !usersQuery.data?.some((user) => user.id === id),
                    )
                    .map((id) => (
                      <MenuItem key={id} value={id}>
                        Current director · {id}
                      </MenuItem>
                    ))}
                  {usersQuery.data?.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.fullName} · {user.userCode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                disabled={directorsMutation.isPending}
                onClick={async () => {
                  try {
                    await directorsMutation.mutateAsync(directorIds);
                    notify.success('Project directors updated');
                  } catch (error) {
                    notify.error(getErrorMessage(error));
                  }
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                Save directors
              </Button>
            </Stack>
          </Paper>
        </>
      )}

      <ConfirmDialog
        open={confirmClose}
        title={
          nextStatus === ProjectStatus.Cancelled
            ? 'Cancel this project?'
            : 'Close this project?'
        }
        description="This is a terminal status with no supported transition back. Confirm only after operational and financial checks are complete."
        confirmLabel={
          nextStatus === ProjectStatus.Cancelled
            ? 'Cancel project'
            : 'Close project'
        }
        destructive
        loading={statusMutation.isPending}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => void submitStatus()}
      />
    </Stack>
  );
}
