import { useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { DetailHeader } from '@/components/entity-detail';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatDate } from '@/format';
import { canCreateUser } from '@/user-admin/roleAccess';
import {
  PROJECT_TEAM_ROLE_OPTIONS,
  projectTeamRoleLabel,
} from './constants';
import { projectKeys } from './queryKeys';
import { QuickCreateUserDialog } from './QuickCreateUserDialog';
import {
  useAssignProjectTeam,
  useProjectDetail,
  useProjectStructure,
  useProjectTeam,
  useProjectUserOptions,
  useRevokeProjectTeam,
} from './useProjects';
import { ProjectTeamRole, type PublicProjectAssignment } from './types';

type Props = {
  projectId?: string;
};

function flattenSiteOptions(
  nodes: Array<{
    id: string;
    siteCode: string;
    siteName: string;
    children?: unknown[];
  }>,
  depth = 0,
): Array<{ id: string; label: string }> {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      label: `${'—'.repeat(depth)} ${node.siteCode} · ${node.siteName}`,
    },
    ...flattenSiteOptions(
      (node.children as typeof nodes | undefined) ?? [],
      depth + 1,
    ),
  ]);
}

export function ProjectTeamPage({ projectId: projectIdProp }: Props = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const canView = Boolean(access) && hasPermission('project.view');
  const canAssign = hasPermission('project_access.assign');
  const canAddUser = canCreateUser(access);
  const detailQuery = useProjectDetail(projectId, canView);
  const teamQuery = useProjectTeam(projectId, canView);
  const usersQuery = useProjectUserOptions(
    canView && hasPermission('user.view'),
  );
  const structureQuery = useProjectStructure(
    projectId,
    canView && hasPermission('site.view'),
  );
  const assignMutation = useAssignProjectTeam(projectId ?? '');
  const revokeMutation = useRevokeProjectTeam(projectId ?? '');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [teamRole, setTeamRole] = useState(ProjectTeamRole.SiteEngineer);
  const [siteId, setSiteId] = useState('');
  const [accessStartDate, setAccessStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [accessEndDate, setAccessEndDate] = useState('');

  const project = detailQuery.data;
  const members = teamQuery.data ?? [];
  const userNameById = useMemo(
    () =>
      new Map((usersQuery.data ?? []).map((user) => [user.id, user.fullName])),
    [usersQuery.data],
  );
  const siteOptions = useMemo(
    () => flattenSiteOptions(structureQuery.data ?? []),
    [structureQuery.data],
  );
  /** Users already on this project (active) — hide from assign picker. */
  const availableUsers = useMemo(() => {
    const assignedIds = new Set(
      members
        .filter((member) => String(member.status).toLowerCase() === 'active')
        .map((member) => member.userId),
    );
    return (usersQuery.data ?? []).filter((user) => !assignedIds.has(user.id));
  }, [members, usersQuery.data]);

  const columns = useMemo<GridColDef<PublicProjectAssignment>[]>(
    () => [
      {
        field: 'userId',
        headerName: 'User',
        flex: 1,
        minWidth: 160,
        valueGetter: (_v, row) =>
          userNameById.get(row.userId) ?? row.userId,
      },
      {
        field: 'teamRole',
        headerName: 'Team role',
        width: 160,
        valueGetter: (_v, row) =>
          row.teamRole ? projectTeamRoleLabel(row.teamRole) : '—',
      },
      {
        field: 'access',
        headerName: 'Access',
        flex: 1,
        minWidth: 180,
        valueGetter: (_v, row) => {
          const start = formatDate(row.accessStartDate);
          return row.accessEndDate
            ? `${start} → ${formatDate(row.accessEndDate)}`
            : start;
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
      },
    ],
    [userNameById],
  );

  const rowActions = useMemo<DataTableRowAction<PublicProjectAssignment>[]>(
    () => {
      if (!canAssign) return [];
      return [
        {
          id: 'revoke',
          label: 'Revoke',
          danger: true,
          onClick: (row) => setRevokeId(row.id),
          disabled: () => revokeMutation.isPending,
        },
      ];
    },
    [canAssign, revokeMutation.isPending],
  );

  if (!access || (canView && (detailQuery.isLoading || teamQuery.isLoading))) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !canView ||
    (detailQuery.error && isForbiddenError(detailQuery.error)) ||
    (teamQuery.error && isForbiddenError(teamQuery.error))
  ) {
    return (
      <PermissionDenied
        error={detailQuery.error ?? teamQuery.error}
        title="Project team unavailable"
        message="You need project.view and explicit project access."
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

  if (teamQuery.error) {
    return (
      <RetryPanel
        error={teamQuery.error}
        onRetry={() => void teamQuery.refetch()}
        forceRetry
      />
    );
  }

  return (
    <Stack spacing={2.5} data-testid="project-team-page">
      <DetailHeader
        title={`${project.projectName} team`}
        code={project.projectCode}
        backTo={`/projects/${project.id}`}
        backLabel="Project"
        meta={
          canAssign ? (
            <Button
              variant="contained"
              onClick={() => {
                setUserId('');
                setDialogOpen(true);
              }}
            >
              Assign member
            </Button>
          ) : undefined
        }
      />

      <DataTable
        title="Team members"
        rows={members}
        columns={columns}
        getRowId={(row) => row.id}
        emptyTitle="No team members"
        emptyDescription="Assign users with an operational team role."
        height={420}
        paginationMode="client"
        rowActions={rowActions.length > 0 ? rowActions : undefined}
        mobileCard={{
          primaryField: 'userId',
          metaFields: ['teamRole', 'access'],
          statusField: 'status',
        }}
        showColumnVisibility={false}
      />

      <Dialog
        open={dialogOpen}
        onClose={() =>
          assignMutation.isPending ? undefined : setDialogOpen(false)
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Assign team member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {availableUsers.length === 0 ? (
              <EmptyState
                title="No users left to assign"
                description={
                  canAddUser
                    ? 'Everyone available is already on this project. Add a new user to assign them here.'
                    : 'Everyone available is already an active team member. Revoke someone first, or ask an admin to create a user.'
                }
                actionLabel={canAddUser ? 'Add user' : undefined}
                onAction={
                  canAddUser
                    ? () => {
                        // Close assign dialog first so focus is not left under aria-hidden.
                        setDialogOpen(false);
                        window.setTimeout(() => setCreateUserOpen(true), 0);
                      }
                    : undefined
                }
              />
            ) : null}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'flex-start' } }}
            >
              <FormControl
                fullWidth
                required
                disabled={availableUsers.length === 0}
              >
                <InputLabel id="team-user">User</InputLabel>
                <Select
                  labelId="team-user"
                  label="User"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                >
                  {availableUsers.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.fullName} · {user.userCode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {canAddUser ? (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    setDialogOpen(false);
                    window.setTimeout(() => setCreateUserOpen(true), 0);
                  }}
                  disabled={assignMutation.isPending}
                  sx={{ flexShrink: 0, mt: { sm: 0.5 } }}
                >
                  Add user
                </Button>
              ) : null}
            </Stack>
            {canAddUser ? (
              <Typography variant="caption" color="text.secondary">
                Need someone new? Use Add user — they are created and assigned
                to this project in one step.
              </Typography>
            ) : null}
            <FormControl fullWidth required>
              <InputLabel id="team-role">Team role</InputLabel>
              <Select
                labelId="team-role"
                label="Team role"
                value={teamRole}
                onChange={(event) =>
                  setTeamRole(event.target.value as typeof teamRole)
                }
              >
                {PROJECT_TEAM_ROLE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="team-site">Site (optional)</InputLabel>
              <Select
                labelId="team-site"
                label="Site (optional)"
                value={siteId}
                onChange={(event) => setSiteId(event.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {siteOptions.map((site) => (
                  <MenuItem key={site.id} value={site.id}>
                    {site.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                type="date"
                label="Access start"
                value={accessStartDate}
                onChange={(event) => setAccessStartDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
                required
              />
              <TextField
                type="date"
                label="Access end"
                value={accessEndDate}
                onChange={(event) => setAccessEndDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={assignMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              !userId || !accessStartDate || assignMutation.isPending
            }
            onClick={async () => {
              try {
                await assignMutation.mutateAsync({
                  userId,
                  teamRole,
                  siteId: siteId || null,
                  accessStartDate,
                  accessEndDate: accessEndDate || null,
                });
                setDialogOpen(false);
                setUserId('');
                setSiteId('');
                setAccessEndDate('');
                notify.success('Team member assigned');
              } catch (error) {
                notify.error(getErrorMessage(error));
              }
            }}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={revokeId != null}
        title="Revoke team assignment?"
        description="The user will lose this project team assignment."
        confirmLabel="Revoke"
        destructive
        loading={revokeMutation.isPending}
        onCancel={() => setRevokeId(null)}
        onConfirm={async () => {
          if (!revokeId) return;
          try {
            await revokeMutation.mutateAsync(revokeId);
            setRevokeId(null);
            notify.success('Team assignment revoked');
          } catch (error) {
            notify.error(getErrorMessage(error));
          }
        }}
      />

      {canAddUser ? (
        <QuickCreateUserDialog
          open={createUserOpen}
          submitting={assignMutation.isPending}
          onClose={() => {
            setCreateUserOpen(false);
            setDialogOpen(true);
          }}
          onCreated={async (user) => {
            if (!accessStartDate) {
              notify.error('Access start date is required');
              setCreateUserOpen(false);
              setDialogOpen(true);
              setUserId(user.id);
              return;
            }
            try {
              await assignMutation.mutateAsync({
                userId: user.id,
                teamRole,
                siteId: siteId || null,
                accessStartDate,
                accessEndDate: accessEndDate || null,
              });
              await queryClient.invalidateQueries({
                queryKey: projectKeys.users,
              });
              setCreateUserOpen(false);
              setDialogOpen(false);
              setUserId('');
              setSiteId('');
              setAccessEndDate('');
              notify.success(
                `${user.fullName} created and assigned to the project`,
              );
            } catch (error) {
              notify.error(
                getErrorMessage(
                  error,
                  'User was created but could not be assigned to the project',
                ),
              );
              await queryClient.invalidateQueries({
                queryKey: projectKeys.users,
              });
              setUserId(user.id);
              setCreateUserOpen(false);
              setDialogOpen(true);
            }
          }}
        />
      ) : null}
    </Stack>
  );
}
