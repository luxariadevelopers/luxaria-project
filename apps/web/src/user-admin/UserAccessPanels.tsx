import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicProject } from '@/projects/types';
import type { PublicRole } from '@/rbac-admin/types';
import {
  useAssignUserProjects,
  useRemoveUserProjects,
  useReplaceUserRoles,
} from './useUsers';
import type { PublicUser } from './types';

type Props = {
  user: PublicUser;
  roles?: readonly PublicRole[];
  projects?: readonly PublicProject[];
  canAssignRoles: boolean;
  canAssignProjects: boolean;
};

export function UserAccessPanels({
  user,
  roles,
  projects,
  canAssignRoles,
  canAssignProjects,
}: Props) {
  const notify = useNotify();
  const { access } = useAuth();
  const roleMutation = useReplaceUserRoles(user.id);
  const assignProjectsMutation = useAssignUserProjects(user.id);
  const removeProjectsMutation = useRemoveUserProjects(user.id);

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(
    user.roleIds,
  );
  const [projectsToAdd, setProjectsToAdd] = useState<string[]>([]);
  const [projectsToRemove, setProjectsToRemove] = useState<string[]>([]);
  const [confirmRoles, setConfirmRoles] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [actionError, setActionError] = useState<unknown>();

  useEffect(() => {
    setSelectedRoleIds(user.roleIds);
    setProjectsToAdd([]);
    setProjectsToRemove([]);
  }, [user.assignedProjects, user.roleIds]);

  const roleById = useMemo(
    () => new Map((roles ?? []).map((role) => [role.id, role])),
    [roles],
  );
  const projectById = useMemo(
    () =>
      new Map((projects ?? []).map((project) => [project.id, project])),
    [projects],
  );

  const activeRoles = (roles ?? []).filter(
    (role) =>
      role.status === 'active' &&
      (Boolean(access?.bypassPermissions) || !role.bypassPermissions),
  );
  const targetHasBypassRole = user.roleIds.some(
    (roleId) => roleById.get(roleId)?.bypassPermissions,
  );
  const unavailableCurrentRoleIds = user.roleIds.filter(
    (roleId) => !activeRoles.some((role) => role.id === roleId),
  );
  const assignableProjects = (projects ?? []).filter(
    (project) => !user.assignedProjects.includes(project.id),
  );

  const replaceRoles = async () => {
    setActionError(undefined);
    try {
      await roleMutation.mutateAsync(selectedRoleIds);
      setConfirmRoles(false);
      notify.success('User roles replaced successfully');
    } catch (error) {
      setConfirmRoles(false);
      setActionError(error);
      notify.error(getErrorMessage(error, 'Role assignment failed'));
    }
  };

  const addProjects = async () => {
    if (projectsToAdd.length === 0) return;
    setActionError(undefined);
    try {
      await assignProjectsMutation.mutateAsync(projectsToAdd);
      setProjectsToAdd([]);
      notify.success('Projects assigned successfully');
    } catch (error) {
      setActionError(error);
      notify.error(getErrorMessage(error, 'Project assignment failed'));
    }
  };

  const removeProjects = async () => {
    if (projectsToRemove.length === 0) return;
    setActionError(undefined);
    try {
      await removeProjectsMutation.mutateAsync(projectsToRemove);
      setProjectsToRemove([]);
      setConfirmRemoval(false);
      notify.success('Project access removed successfully');
    } catch (error) {
      setConfirmRemoval(false);
      setActionError(error);
      notify.error(getErrorMessage(error, 'Project removal failed'));
    }
  };

  return (
    <Stack spacing={2}>
      {actionError ? (
        <Alert severity="error">
          {getErrorMessage(actionError, 'Access update failed')}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6">Roles</Typography>
            <Typography variant="body2" color="text.secondary">
              Current role IDs are always shown. Saving sends a complete
              replacement list to POST /users/:id/roles.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {user.roleIds.length === 0 ? (
              <Typography color="text.secondary">No roles assigned</Typography>
            ) : (
              user.roleIds.map((roleId) => {
                const role = roleById.get(roleId);
                return (
                  <Chip
                    key={roleId}
                    label={role ? `${role.name} · ${role.code}` : roleId}
                    size="small"
                    variant="outlined"
                  />
                );
              })
            )}
          </Stack>
          {canAssignRoles ? (
            roles ? (
              targetHasBypassRole && !access?.bypassPermissions ? (
                <Alert severity="warning">
                  Only a bypass administrator can change roles for a user who
                  already holds a bypass role.
                </Alert>
              ) : (
                <>
                <FormControl fullWidth>
                  <InputLabel id="user-role-assignment-label">
                    Full role assignment
                  </InputLabel>
                  <Select
                    multiple
                    labelId="user-role-assignment-label"
                    label="Full role assignment"
                    value={selectedRoleIds}
                    onChange={(event) =>
                      setSelectedRoleIds(
                        typeof event.target.value === 'string'
                          ? event.target.value.split(',')
                          : event.target.value,
                      )
                    }
                  >
                    {unavailableCurrentRoleIds.map((roleId) => (
                      <MenuItem key={roleId} value={roleId}>
                        Current inactive/unavailable role ·{' '}
                        {roleById.get(roleId)?.name ?? roleId}
                      </MenuItem>
                    ))}
                    {activeRoles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name} · {role.code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  onClick={() => setConfirmRoles(true)}
                  disabled={
                    roleMutation.isPending ||
                    JSON.stringify([...selectedRoleIds].sort()) ===
                      JSON.stringify([...user.roleIds].sort())
                  }
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Replace roles
                </Button>
                </>
              )
            ) : (
              <Alert severity="info">
                Role assignment also needs role.view so the active role
                catalog can be loaded safely. Existing IDs remain visible.
              </Alert>
            )
          ) : (
            <Alert severity="info">
              user.assign_role is required to change this assignment.
            </Alert>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6">Projects</Typography>
            <Typography variant="body2" color="text.secondary">
              Assign merges project access; remove deactivates the selected
              access records.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {user.assignedProjects.length === 0 ? (
              <Typography color="text.secondary">
                No projects assigned
              </Typography>
            ) : (
              user.assignedProjects.map((projectId) => {
                const project = projectById.get(projectId);
                return (
                  <Chip
                    key={projectId}
                    label={
                      project
                        ? `${project.projectName} · ${project.projectCode}`
                        : projectId
                    }
                    size="small"
                    variant="outlined"
                  />
                );
              })
            )}
          </Stack>
          {canAssignProjects ? (
            <>
              {projects ? (
                <>
                  <FormControl fullWidth>
                    <InputLabel id="user-project-add-label">
                      Projects to assign
                    </InputLabel>
                    <Select
                      multiple
                      labelId="user-project-add-label"
                      label="Projects to assign"
                      value={projectsToAdd}
                      onChange={(event) =>
                        setProjectsToAdd(
                          typeof event.target.value === 'string'
                            ? event.target.value.split(',')
                            : event.target.value,
                        )
                      }
                    >
                      {assignableProjects.map((project) => (
                        <MenuItem key={project.id} value={project.id}>
                          {project.projectName} · {project.projectCode}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    onClick={() => void addProjects()}
                    disabled={
                      projectsToAdd.length === 0 ||
                      assignProjectsMutation.isPending
                    }
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Assign projects
                  </Button>
                </>
              ) : (
                <Alert severity="info">
                  Assigning a new project also needs project.view so valid
                  project choices can be loaded.
                </Alert>
              )}
              {user.assignedProjects.length > 0 ? (
                <>
                  <FormControl fullWidth>
                    <InputLabel id="user-project-remove-label">
                      Projects to remove
                    </InputLabel>
                    <Select
                      multiple
                      labelId="user-project-remove-label"
                      label="Projects to remove"
                      value={projectsToRemove}
                      onChange={(event) =>
                        setProjectsToRemove(
                          typeof event.target.value === 'string'
                            ? event.target.value.split(',')
                            : event.target.value,
                        )
                      }
                    >
                      {user.assignedProjects.map((projectId) => {
                        const project = projectById.get(projectId);
                        return (
                          <MenuItem key={projectId} value={projectId}>
                            {project
                              ? `${project.projectName} · ${project.projectCode}`
                              : projectId}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setConfirmRemoval(true)}
                    disabled={
                      projectsToRemove.length === 0 ||
                      removeProjectsMutation.isPending
                    }
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Remove project access
                  </Button>
                </>
              ) : null}
            </>
          ) : (
            <Alert severity="info">
              user.assign_project is required to change project access.
            </Alert>
          )}
        </Stack>
      </Paper>

      <ConfirmDialog
        open={confirmRoles}
        title="Replace all user roles?"
        description={`The complete role assignment will be replaced with ${selectedRoleIds.length} selected role${selectedRoleIds.length === 1 ? '' : 's'}. This can immediately change effective permissions.`}
        confirmLabel="Replace roles"
        destructive={
          targetHasBypassRole ||
          selectedRoleIds.some(
            (roleId) => roleById.get(roleId)?.bypassPermissions,
          )
        }
        loading={roleMutation.isPending}
        onCancel={() => setConfirmRoles(false)}
        onConfirm={() => void replaceRoles()}
      />
      <ConfirmDialog
        open={confirmRemoval}
        title="Remove project access?"
        description={`Access to ${projectsToRemove.length} selected project${projectsToRemove.length === 1 ? '' : 's'} will be deactivated for this user.`}
        confirmLabel="Remove access"
        destructive
        loading={removeProjectsMutation.isPending}
        onCancel={() => setConfirmRemoval(false)}
        onConfirm={() => void removeProjects()}
      />
    </Stack>
  );
}
