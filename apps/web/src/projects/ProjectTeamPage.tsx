import { useMemo, useState } from 'react';
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
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailHeader } from '@/components/entity-detail';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatDate } from '@/format';
import {
  PROJECT_TEAM_ROLE_OPTIONS,
  projectTeamRoleLabel,
} from './constants';
import {
  useAssignProjectTeam,
  useProjectDetail,
  useProjectStructure,
  useProjectTeam,
  useProjectUserOptions,
  useRevokeProjectTeam,
} from './useProjects';
import { ProjectTeamRole } from './types';

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
  const canView = Boolean(access) && hasPermission('project.view');
  const canAssign = hasPermission('project_access.assign');
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
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [teamRole, setTeamRole] = useState(ProjectTeamRole.SiteEngineer);
  const [siteId, setSiteId] = useState('');
  const [accessStartDate, setAccessStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [accessEndDate, setAccessEndDate] = useState('');

  const project = detailQuery.data;
  const userNameById = useMemo(
    () =>
      new Map((usersQuery.data ?? []).map((user) => [user.id, user.fullName])),
    [usersQuery.data],
  );
  const siteOptions = useMemo(
    () => flattenSiteOptions(structureQuery.data ?? []),
    [structureQuery.data],
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

  const members = teamQuery.data ?? [];

  return (
    <Stack spacing={2.5} data-testid="project-team-page">
      <DetailHeader
        title={`${project.projectName} team`}
        code={project.projectCode}
        backTo={`/projects/${project.id}`}
        backLabel="Project"
        meta={
          canAssign ? (
            <Button variant="contained" onClick={() => setDialogOpen(true)}>
              Assign member
            </Button>
          ) : undefined
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        {members.length === 0 ? (
          <EmptyState
            title="No team members"
            description="Assign users with an operational team role."
          />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Team role</TableCell>
                <TableCell>Access</TableCell>
                <TableCell>Status</TableCell>
                {canAssign ? <TableCell align="right">Actions</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    {userNameById.get(member.userId) ?? member.userId}
                  </TableCell>
                  <TableCell>
                    {projectTeamRoleLabel(member.teamRole)}
                  </TableCell>
                  <TableCell>
                    {formatDate(member.accessStartDate)}
                    {member.accessEndDate
                      ? ` → ${formatDate(member.accessEndDate)}`
                      : ''}
                  </TableCell>
                  <TableCell>{member.status}</TableCell>
                  {canAssign ? (
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        disabled={revokeMutation.isPending}
                        onClick={() => setRevokeId(member.id)}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

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
            <FormControl fullWidth required>
              <InputLabel id="team-user">User</InputLabel>
              <Select
                labelId="team-user"
                label="User"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
              >
                {(usersQuery.data ?? []).map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.fullName} · {user.userCode}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
    </Stack>
  );
}
