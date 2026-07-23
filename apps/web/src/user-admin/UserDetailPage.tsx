import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  resolveVisibleActions,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatDate, formatDateTime } from '@/format';
import { PageHeader } from '@/layouts/PageHeader';
import { useProjectsList } from '@/projects/useProjects';
import { useRolesList } from '@/rbac-admin/useRbac';
import { PasswordResetDialog } from './PasswordResetDialog';
import {
  canAssignUserProjects,
  canAssignUserRoles,
  canOpenUsers,
} from './roleAccess';
import { UserAccessPanels } from './UserAccessPanels';
import { UserStatus } from './types';
import {
  useActivateUser,
  useDeactivateUser,
  useResetUserPassword,
  useUserDetail,
} from './useUsers';

type Props = {
  userId?: string;
};

function Fact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value ?? '—'}</Typography>
    </Stack>
  );
}

export function UserDetailPage({ userId: userIdProp }: Props = {}) {
  const params = useParams<{ userId: string }>();
  const userId = userIdProp ?? params.userId;
  const navigate = useNavigate();
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const canView = canOpenUsers(access);
  const userQuery = useUserDetail(userId, canView);
  const rolesQuery = useRolesList(
    { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' },
    canView && hasPermission('role.view'),
  );
  const projectsQuery = useProjectsList(
    { page: 1, limit: 100, sortBy: 'projectName', sortOrder: 'asc' },
    canView && hasPermission('project.view'),
  );
  const activateMutation = useActivateUser(userId ?? '');
  const deactivateMutation = useDeactivateUser(userId ?? '');
  const passwordMutation = useResetUserPassword(userId ?? '');

  const [statusAction, setStatusAction] = useState<
    'activate' | 'deactivate' | null
  >(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<unknown>();
  const [actionError, setActionError] = useState<unknown>();

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !canView ||
    (userQuery.error && isForbiddenError(userQuery.error))
  ) {
    return (
      <PermissionDenied
        error={userQuery.error}
        title="User unavailable"
        message="You need user.view to open this user."
      />
    );
  }

  const user = userQuery.data;
  const runStatusAction = async () => {
    if (!statusAction) return;
    setActionError(undefined);
    try {
      if (statusAction === 'activate') {
        await activateMutation.mutateAsync();
        notify.success('User activated successfully');
      } else {
        await deactivateMutation.mutateAsync();
        notify.success('User deactivated and active sessions revoked');
      }
      setStatusAction(null);
    } catch (error) {
      setStatusAction(null);
      setActionError(error);
      notify.error(getErrorMessage(error, 'Status change failed'));
    }
  };

  const resetPassword = async (newPassword: string) => {
    setPasswordError(undefined);
    try {
      await passwordMutation.mutateAsync(newPassword);
      notify.success('Password reset and active sessions revoked');
      setPasswordOpen(false);
    } catch (error) {
      setPasswordError(error);
      notify.error(getErrorMessage(error, 'Password reset failed'));
    }
  };

  const summary = user
    ? [
        { id: 'status', label: 'Status', value: user.status },
        {
          id: 'department',
          label: 'Department',
          value: user.department ?? '—',
        },
        {
          id: 'designation',
          label: 'Designation',
          value: user.designation ?? '—',
        },
        {
          id: 'roles',
          label: 'Roles',
          value: user.roleIds.length,
        },
        {
          id: 'projects',
          label: 'Projects',
          value: user.assignedProjects.length,
        },
        {
          id: 'last-login',
          label: 'Last login',
          value: formatDateTime(user.lastLoginAt),
        },
      ]
    : [];

  const actions = useMemo<EntityDetailAction[]>(() => {
    if (!user) return [];
    return [
      {
        id: 'edit',
        label: 'Edit',
        permission: 'user.update',
        allowedStatuses: Object.values(UserStatus),
        variant: 'contained',
        onClick: () => void navigate(`/users/${user.id}/edit`),
      },
      {
        id: 'deactivate',
        label: 'Deactivate',
        permission: 'user.deactivate',
        allowedStatuses: [UserStatus.Active],
        color: 'warning',
        variant: 'outlined',
        onClick: () => setStatusAction('deactivate'),
      },
      {
        id: 'activate',
        label: 'Activate',
        permission: 'user.activate',
        allowedStatuses: [UserStatus.Inactive, UserStatus.Locked],
        color: 'success',
        variant: 'outlined',
        onClick: () => setStatusAction('activate'),
      },
      {
        id: 'reset-password',
        label: 'Reset password',
        permission: 'user.reset_password',
        allowedStatuses: Object.values(UserStatus),
        color: 'warning',
        variant: 'outlined',
        onClick: () => {
          setPasswordError(undefined);
          setPasswordOpen(true);
        },
      },
    ];
  }, [navigate, user]);

  return (
    <>
      <PageHeader hideTitle />
      <EntityDetailLayout
        canView={canView}
        loading={userQuery.isLoading}
        error={userQuery.error}
        onRetry={() => void userQuery.refetch()}
        notFound={!userQuery.isLoading && !userQuery.error && !user}
        permissionTitle="User unavailable"
        permissionMessage="You need user.view to open this account."
        notFoundTitle="User not found"
        notFoundDescription="The user may have been deleted or the id is invalid."
        header={
          user ? (
            <DetailHeader
              title={user.fullName}
              code={user.userCode}
              subtitle={user.email ?? user.mobile ?? undefined}
              backTo="/users"
              backLabel="Users"
              meta={
                <Chip
                  size="small"
                  label={user.status}
                  color={
                    user.status === UserStatus.Active
                      ? 'success'
                      : user.status === UserStatus.Locked
                        ? 'error'
                        : 'warning'
                  }
                  variant="outlined"
                />
              }
            />
          ) : undefined
        }
        actionBar={
          user &&
          resolveVisibleActions(actions, {
            status: user.status,
            hasPermission,
          }).length > 0 ? (
            <EntityActionBar
              actions={actions}
              status={user.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        summary={user ? <SummaryCards fields={summary} /> : undefined}
      >
        {user ? (
          <Stack spacing={2.5}>
            {actionError ? (
              <Alert severity="error">
                {getErrorMessage(actionError, 'User action failed')}
              </Alert>
            ) : null}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Profile
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                  },
                }}
              >
                <Fact label="Email" value={user.email ?? '—'} />
                <Fact label="Mobile" value={user.mobile ?? '—'} />
                <Fact label="Employee ID" value={user.employeeId ?? '—'} />
                <Fact
                  label="Reporting manager"
                  value={user.reportingManager ?? '—'}
                />
                <Fact
                  label="Joining date"
                  value={formatDate(user.joiningDate)}
                />
                <Fact
                  label="Profile photo reference"
                  value={user.profilePhoto ?? '—'}
                />
                <Fact
                  label="Created"
                  value={formatDateTime(user.createdAt)}
                />
                <Fact
                  label="Updated"
                  value={formatDateTime(user.updatedAt)}
                />
              </Box>
            </Paper>

            {rolesQuery.error && hasPermission('role.view') ? (
              <Alert severity="info">
                Role names are unavailable. Current role IDs remain visible,
                but assignment is disabled until the catalog can be loaded.
              </Alert>
            ) : null}
            {projectsQuery.error && hasPermission('project.view') ? (
              <Alert severity="info">
                Project names are unavailable. Current project IDs and removal
                actions remain available.
              </Alert>
            ) : null}
            <UserAccessPanels
              user={user}
              roles={
                rolesQuery.isSuccess ? rolesQuery.data.items : undefined
              }
              projects={
                projectsQuery.isSuccess
                  ? projectsQuery.data.items
                  : undefined
              }
              canAssignRoles={canAssignUserRoles(access)}
              canAssignProjects={canAssignUserProjects(access)}
            />
          </Stack>
        ) : null}
      </EntityDetailLayout>

      {user ? (
        <>
          <ConfirmDialog
            open={Boolean(statusAction)}
            title={
              statusAction === 'deactivate'
                ? `Deactivate ${user.fullName}?`
                : `Activate ${user.fullName}?`
            }
            description={
              statusAction === 'deactivate'
                ? 'Login will be blocked and all active sessions will be revoked.'
                : 'Login will be enabled and any lock state will be cleared.'
            }
            confirmLabel={
              statusAction === 'deactivate'
                ? 'Deactivate user'
                : 'Activate user'
            }
            destructive={statusAction === 'deactivate'}
            loading={
              activateMutation.isPending || deactivateMutation.isPending
            }
            onCancel={() => setStatusAction(null)}
            onConfirm={() => void runStatusAction()}
          />
          <PasswordResetDialog
            open={passwordOpen}
            userName={user.fullName}
            loading={passwordMutation.isPending}
            serverError={passwordError}
            onClose={() => {
              setPasswordOpen(false);
              setPasswordError(undefined);
            }}
            onConfirm={resetPassword}
          />
        </>
      ) : null}
    </>
  );
}
