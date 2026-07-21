import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailHeader } from '@/components/entity-detail';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import {
  PROJECT_SETTINGS_FLAG_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_STATUS_TRANSITIONS,
} from './constants';
import {
  useArchiveProject,
  useAssignProjectDirectors,
  useAssignProjectManager,
  useCloneProject,
  useCloseProject,
  useProjectDetail,
  useProjectUserOptions,
  useResumeProject,
  useRestoreProject,
  useSoftDeleteProject,
  useSuspendProject,
  useUpdateProjectSettings,
  useUpdateProjectStatus,
} from './useProjects';
import {
  DEFAULT_PROJECT_SETTINGS,
  ProjectStatus,
  type ProjectSettings,
} from './types';

type Props = {
  projectId?: string;
};

type LifecycleAction =
  | 'suspend'
  | 'resume'
  | 'close'
  | 'archive'
  | 'restore'
  | 'soft-delete'
  | null;

export function ProjectSettingsPage({
  projectId: projectIdProp,
}: Props = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const navigate = useNavigate();
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const canUpdate =
    Boolean(access) &&
    hasPermission('project.view') &&
    hasPermission('project.update');
  const canClose = hasPermission('project.close');
  const canClone = hasPermission('project.create');
  const detailQuery = useProjectDetail(projectId, canUpdate);
  const usersQuery = useProjectUserOptions(
    canUpdate && hasPermission('user.view'),
  );
  const statusMutation = useUpdateProjectStatus(projectId ?? '');
  const settingsMutation = useUpdateProjectSettings(projectId ?? '');
  const managerMutation = useAssignProjectManager(projectId ?? '');
  const directorsMutation = useAssignProjectDirectors(projectId ?? '');
  const suspendMutation = useSuspendProject(projectId ?? '');
  const resumeMutation = useResumeProject(projectId ?? '');
  const closeMutation = useCloseProject(projectId ?? '');
  const archiveMutation = useArchiveProject(projectId ?? '');
  const restoreMutation = useRestoreProject(projectId ?? '');
  const cloneMutation = useCloneProject(projectId ?? '');
  const softDeleteMutation = useSoftDeleteProject(projectId ?? '');

  const project = detailQuery.data;
  const [nextStatus, setNextStatus] = useState<ProjectStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [actualCompletionDate, setActualCompletionDate] = useState('');
  const [managerId, setManagerId] = useState('');
  const [directorIds, setDirectorIds] = useState<string[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<ProjectSettings>(
    DEFAULT_PROJECT_SETTINGS,
  );
  const [confirmClose, setConfirmClose] = useState(false);
  const [lifecycleAction, setLifecycleAction] =
    useState<LifecycleAction>(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [copySettings, setCopySettings] = useState(true);
  const [copyFinancialConfig, setCopyFinancialConfig] = useState(true);
  const [copyStructure, setCopyStructure] = useState(false);

  useEffect(() => {
    if (!project) return;
    setManagerId(project.projectManager ?? '');
    setDirectorIds(project.assignedDirectors);
    setActualCompletionDate(
      project.actualCompletionDate?.slice(0, 10) ?? '',
    );
    setSettingsDraft(project.settings);
    setCloneName(`${project.projectName} (copy)`);
    setNextStatus('');
  }, [project]);

  const allowedStatuses = useMemo(() => {
    if (!project) return [];
    return PROJECT_STATUS_TRANSITIONS[project.status].filter(
      (status) =>
        (status !== ProjectStatus.Closed &&
          status !== ProjectStatus.Archived &&
          status !== ProjectStatus.Cancelled) ||
        hasPermission('project.close'),
    );
  }, [project, hasPermission]);

  const lifecyclePending =
    suspendMutation.isPending ||
    resumeMutation.isPending ||
    closeMutation.isPending ||
    archiveMutation.isPending ||
    restoreMutation.isPending ||
    softDeleteMutation.isPending;

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

  const runLifecycle = async () => {
    if (!lifecycleAction) return;
    try {
      switch (lifecycleAction) {
        case 'suspend':
          await suspendMutation.mutateAsync();
          notify.success('Project suspended');
          break;
        case 'resume':
          await resumeMutation.mutateAsync();
          notify.success('Project resumed');
          break;
        case 'close':
          await closeMutation.mutateAsync();
          notify.success('Project closed');
          break;
        case 'archive':
          await archiveMutation.mutateAsync();
          notify.success('Project archived');
          break;
        case 'restore':
          await restoreMutation.mutateAsync();
          notify.success('Project restored to Closed');
          break;
        case 'soft-delete':
          await softDeleteMutation.mutateAsync();
          notify.success('Project soft-deleted');
          navigate('/projects');
          break;
      }
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setLifecycleAction(null);
    }
  };

  const statusLabel = (status: ProjectStatus) =>
    PROJECT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status;

  const canSuspend =
    project.status !== ProjectStatus.OnHold &&
    project.status !== ProjectStatus.Closed &&
    project.status !== ProjectStatus.Archived &&
    project.status !== ProjectStatus.Cancelled &&
    project.status !== ProjectStatus.Completed;
  const canResume = project.status === ProjectStatus.OnHold;
  const canCloseAction =
    canClose && project.status === ProjectStatus.Completed;
  const canArchive =
    canClose && project.status === ProjectStatus.Closed;
  const canRestoreArchived = project.status === ProjectStatus.Archived;

  return (
    <Stack spacing={2.5} data-testid="project-settings-page">
      <DetailHeader
        title={`${project.projectName} settings`}
        code={project.projectCode}
        backTo={`/projects/${project.id}`}
        backLabel="Project"
      />

      <Paper
        variant="outlined"
        sx={{ p: 2 }}
        data-testid="project-lifecycle-actions"
      >
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6">Lifecycle actions</Typography>
            <Typography variant="body2" color="text.secondary">
              Current status: {project.status}
              {project.statusBeforeHold
                ? ` · held from ${project.statusBeforeHold}`
                : ''}
              . Dedicated lifecycle endpoints apply suspend/resume/close/archive.
            </Typography>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
          >
            {canSuspend ? (
              <Button
                variant="outlined"
                disabled={lifecyclePending}
                onClick={() => setLifecycleAction('suspend')}
              >
                Suspend
              </Button>
            ) : null}
            {canResume ? (
              <Button
                variant="contained"
                disabled={lifecyclePending}
                onClick={() => setLifecycleAction('resume')}
              >
                Resume
              </Button>
            ) : null}
            {canCloseAction ? (
              <Button
                variant="outlined"
                color="warning"
                disabled={lifecyclePending}
                onClick={() => setLifecycleAction('close')}
              >
                Close
              </Button>
            ) : null}
            {canArchive ? (
              <Button
                variant="outlined"
                color="warning"
                disabled={lifecyclePending}
                onClick={() => setLifecycleAction('archive')}
              >
                Archive
              </Button>
            ) : null}
            {canRestoreArchived ? (
              <Button
                variant="contained"
                disabled={lifecyclePending}
                onClick={() => setLifecycleAction('restore')}
              >
                Restore
              </Button>
            ) : null}
            {canClone ? (
              <Button
                variant="outlined"
                disabled={cloneMutation.isPending}
                onClick={() => setCloneOpen(true)}
              >
                Clone
              </Button>
            ) : null}
            <Button
              variant="outlined"
              color="error"
              disabled={lifecyclePending}
              onClick={() => setLifecycleAction('soft-delete')}
            >
              Soft-delete
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6">Module feature flags</Typography>
            <Typography variant="body2" color="text.secondary">
              Toggle project modules via PATCH /projects/:id/settings.
            </Typography>
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            {PROJECT_SETTINGS_FLAG_OPTIONS.map((flag) => (
              <FormControlLabel
                key={flag.key}
                control={
                  <Switch
                    checked={settingsDraft[flag.key]}
                    onChange={(event) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        [flag.key]: event.target.checked,
                      }))
                    }
                  />
                }
                label={flag.label}
              />
            ))}
          </Box>
          <Button
            variant="contained"
            disabled={settingsMutation.isPending}
            onClick={async () => {
              try {
                await settingsMutation.mutateAsync(settingsDraft);
                notify.success('Project module settings saved');
              } catch (error) {
                notify.error(getErrorMessage(error));
              }
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            Save feature flags
          </Button>
        </Stack>
      </Paper>

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
              permissions. Use lifecycle actions above when applicable.
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
                    nextStatus === ProjectStatus.Archived ||
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
            : nextStatus === ProjectStatus.Archived
              ? 'Archive this project?'
              : 'Close this project?'
        }
        description="Confirm only after operational and financial checks are complete."
        confirmLabel={
          nextStatus === ProjectStatus.Cancelled
            ? 'Cancel project'
            : nextStatus === ProjectStatus.Archived
              ? 'Archive project'
              : 'Close project'
        }
        destructive
        loading={statusMutation.isPending}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => void submitStatus()}
      />

      <ConfirmDialog
        open={lifecycleAction != null}
        title={
          lifecycleAction === 'suspend'
            ? 'Suspend this project?'
            : lifecycleAction === 'resume'
              ? 'Resume this project?'
              : lifecycleAction === 'close'
                ? 'Close this project?'
                : lifecycleAction === 'archive'
                  ? 'Archive this project?'
                  : lifecycleAction === 'restore'
                    ? 'Restore this project to Closed?'
                    : 'Soft-delete this project?'
        }
        description={
          lifecycleAction === 'soft-delete'
            ? 'The project will be soft-deleted and hidden from normal lists.'
            : 'This uses the dedicated lifecycle API for the current status.'
        }
        confirmLabel={
          lifecycleAction === 'soft-delete'
            ? 'Soft-delete'
            : lifecycleAction
              ? lifecycleAction.charAt(0).toUpperCase() +
                lifecycleAction.slice(1)
              : 'Confirm'
        }
        destructive={
          lifecycleAction === 'soft-delete' ||
          lifecycleAction === 'close' ||
          lifecycleAction === 'archive'
        }
        loading={lifecyclePending}
        onCancel={() => setLifecycleAction(null)}
        onConfirm={() => void runLifecycle()}
      />

      <Dialog
        open={cloneOpen}
        onClose={() => (cloneMutation.isPending ? undefined : setCloneOpen(false))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Clone project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="New project name"
              value={cloneName}
              onChange={(event) => setCloneName(event.target.value)}
              fullWidth
              required
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copySettings}
                  onChange={(event) => setCopySettings(event.target.checked)}
                />
              }
              label="Copy module settings"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyFinancialConfig}
                  onChange={(event) =>
                    setCopyFinancialConfig(event.target.checked)
                  }
                />
              }
              label="Copy financial config"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={copyStructure}
                  onChange={(event) => setCopyStructure(event.target.checked)}
                />
              }
              label="Copy site structure"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCloneOpen(false)}
            disabled={cloneMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!cloneName.trim() || cloneMutation.isPending}
            onClick={async () => {
              try {
                const cloned = await cloneMutation.mutateAsync({
                  projectName: cloneName.trim(),
                  copySettings,
                  copyFinancialConfig,
                  copyStructure,
                });
                setCloneOpen(false);
                notify.success('Project cloned as Draft');
                navigate(`/projects/${cloned.id}`);
              } catch (error) {
                notify.error(getErrorMessage(error));
              }
            }}
          >
            Clone
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
