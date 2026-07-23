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
import { formatDateTime } from '@/format';
import { PageHeader } from '@/layouts/PageHeader';
import { CloneRoleDialog } from './CloneRoleDialog';
import { RolePermissionPanel } from './RolePermissionPanel';
import {
  canAssignRolesFromRbac,
  canEditRole,
  canOpenRoles,
  canViewPermissionCatalog,
} from './roleAccess';
import { RoleStatus } from './types';
import { RoleUserAssignmentPanel } from './RoleUserAssignmentPanel';
import {
  useActivateRole,
  useCloneRole,
  useDeactivateRole,
  usePermissionCatalog,
  useRoleDetail,
  useRolesList,
} from './useRbac';
import {
  toCloneRoleInput,
  type CloneRoleFormValues,
} from './validation';

type Props = {
  roleId?: string;
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
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

export function RoleDetailPage({ roleId: roleIdProp }: Props = {}) {
  const params = useParams<{ roleId: string }>();
  const roleId = roleIdProp ?? params.roleId;
  const { access, hasPermission } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const canView = canOpenRoles(access);
  const canUpdate = canEditRole(access);
  const canReadCatalog = canViewPermissionCatalog(access);

  const roleQuery = useRoleDetail(roleId, canView);
  const permissionQuery = usePermissionCatalog(
    canView && canReadCatalog,
  );
  const rolesQuery = useRolesList(
    { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' },
    canView,
  );
  const activateMutation = useActivateRole(roleId ?? '');
  const deactivateMutation = useDeactivateRole(roleId ?? '');
  const cloneMutation = useCloneRole(roleId ?? '');

  const [statusAction, setStatusAction] = useState<
    'activate' | 'deactivate' | null
  >(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneError, setCloneError] = useState<unknown>();
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
    (roleQuery.error && isForbiddenError(roleQuery.error))
  ) {
    return (
      <PermissionDenied
        error={roleQuery.error}
        title="Role unavailable"
        message="You need role.view to open this role."
      />
    );
  }

  const role = roleQuery.data;
  const runStatusAction = async () => {
    if (!statusAction) return;
    setActionError(undefined);
    try {
      if (statusAction === 'activate') {
        await activateMutation.mutateAsync();
        notify.success('Role activated successfully');
      } else {
        await deactivateMutation.mutateAsync();
        notify.success('Role deactivated successfully');
      }
      setStatusAction(null);
    } catch (error) {
      setStatusAction(null);
      setActionError(error);
      notify.error(getErrorMessage(error, 'Role status change failed'));
    }
  };

  const clone = async (values: CloneRoleFormValues) => {
    setCloneError(undefined);
    try {
      const cloned = await cloneMutation.mutateAsync(
        toCloneRoleInput(values),
      );
      setCloneOpen(false);
      notify.success(`Role ${cloned.code} cloned successfully`);
      void navigate(`/administration/roles/${cloned.id}`);
    } catch (error) {
      setCloneError(error);
      notify.error(getErrorMessage(error, 'Role clone failed'));
    }
  };

  const summary = role
    ? [
        { id: 'status', label: 'Status', value: role.status },
        {
          id: 'type',
          label: 'Type',
          value: role.isSystem ? 'System' : 'Custom',
        },
        {
          id: 'permissions',
          label: 'Permissions',
          value: role.permissions.length,
        },
        {
          id: 'bypass',
          label: 'Permission bypass',
          value: role.bypassPermissions ? 'Enabled' : 'Disabled',
        },
        {
          id: 'created',
          label: 'Created',
          value: formatDateTime(role.createdAt),
        },
        {
          id: 'updated',
          label: 'Updated',
          value: formatDateTime(role.updatedAt),
        },
      ]
    : [];

  const actions = useMemo<EntityDetailAction[]>(() => {
    if (!role) return [];
    return [
      {
        id: 'edit',
        label: 'Edit',
        permission: 'role.update',
        allowedStatuses: Object.values(RoleStatus),
        variant: 'contained',
        onClick: () =>
          void navigate(`/administration/roles/${role.id}/edit`),
      },
      {
        id: 'clone',
        label: 'Clone',
        permission: 'role.create',
        allowedStatuses: Object.values(RoleStatus),
        variant: 'outlined',
        onClick: () => {
          setCloneError(undefined);
          setCloneOpen(true);
        },
      },
      {
        id: 'deactivate',
        label: 'Deactivate',
        permission: 'role.update',
        allowedStatuses: [RoleStatus.Active],
        color: 'warning',
        variant: 'outlined',
        disabled: role.bypassPermissions,
        onClick: () => setStatusAction('deactivate'),
      },
      {
        id: 'activate',
        label: 'Activate',
        permission: 'role.update',
        allowedStatuses: [RoleStatus.Inactive],
        color: 'success',
        variant: 'outlined',
        onClick: () => setStatusAction('activate'),
      },
    ];
  }, [navigate, role]);

  return (
    <>
      <PageHeader hideTitle />
      <EntityDetailLayout
        canView={canView}
        loading={roleQuery.isLoading}
        error={roleQuery.error}
        onRetry={() => void roleQuery.refetch()}
        notFound={!roleQuery.isLoading && !roleQuery.error && !role}
        permissionTitle="Role unavailable"
        permissionMessage="You need role.view to open this role."
        notFoundTitle="Role not found"
        notFoundDescription="The role may have been removed or the id is invalid."
        header={
          role ? (
            <DetailHeader
              title={role.name}
              code={role.code}
              subtitle={role.description ?? undefined}
              backTo="/administration/roles"
              backLabel="Roles"
              meta={
                <Stack direction="row" spacing={1}>
                  <Chip
                    size="small"
                    label={role.status}
                    color={
                      role.status === RoleStatus.Active
                        ? 'success'
                        : 'default'
                    }
                    variant="outlined"
                  />
                  {role.bypassPermissions ? (
                    <Chip
                      size="small"
                      label="Bypass"
                      color="warning"
                    />
                  ) : null}
                </Stack>
              }
            />
          ) : undefined
        }
        actionBar={
          role &&
          resolveVisibleActions(actions, {
            status: role.status,
            hasPermission,
          }).length > 0 ? (
            <EntityActionBar
              actions={actions}
              status={role.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        summary={role ? <SummaryCards fields={summary} /> : undefined}
      >
        {role ? (
          <Stack spacing={2.5}>
            {actionError ? (
              <Alert severity="error">
                {getErrorMessage(actionError, 'Role action failed')}
              </Alert>
            ) : null}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Role metadata
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                  },
                }}
              >
                <Fact label="Role ID" value={role.id} />
                <Fact
                  label="System managed"
                  value={role.isSystem ? 'Yes' : 'No'}
                />
              </Box>
            </Paper>

            <RolePermissionPanel
              role={role}
              catalog={
                permissionQuery.isSuccess
                  ? permissionQuery.data
                  : undefined
              }
              catalogError={permissionQuery.error}
              canViewCatalog={canReadCatalog}
              canUpdate={canUpdate}
            />

            {rolesQuery.error ? (
              <Alert severity="error">
                The role catalog required for safe full user-role replacement
                is unavailable.
              </Alert>
            ) : null}
            <RoleUserAssignmentPanel
              role={role}
              roles={
                rolesQuery.isSuccess ? rolesQuery.data.items : [role]
              }
              canViewUsers={hasPermission('user.view')}
              canAssign={canAssignRolesFromRbac(access)}
            />
          </Stack>
        ) : null}
      </EntityDetailLayout>

      {role ? (
        <>
          <ConfirmDialog
            open={Boolean(statusAction)}
            title={
              statusAction === 'deactivate'
                ? `Deactivate ${role.name}?`
                : `Activate ${role.name}?`
            }
            description={
              statusAction === 'deactivate'
                ? 'Inactive roles stop contributing permissions to every assigned user.'
                : 'This role will resume contributing its permissions to assigned users.'
            }
            confirmLabel={
              statusAction === 'deactivate'
                ? 'Deactivate role'
                : 'Activate role'
            }
            destructive={statusAction === 'deactivate'}
            loading={
              activateMutation.isPending || deactivateMutation.isPending
            }
            onCancel={() => setStatusAction(null)}
            onConfirm={() => void runStatusAction()}
          />
          <CloneRoleDialog
            open={cloneOpen}
            sourceName={role.name}
            loading={cloneMutation.isPending}
            serverError={cloneError}
            onClose={() => {
              setCloneOpen(false);
              setCloneError(undefined);
            }}
            onSubmit={clone}
          />
        </>
      ) : null}
    </>
  );
}
