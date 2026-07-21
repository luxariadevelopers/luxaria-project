import { useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { RoleForm } from './RoleForm';
import { canEditRole } from './roleAccess';
import { useRoleDetail, useUpdateRole } from './useRbac';
import {
  toUpdateRoleInput,
  type RoleFormValues,
} from './validation';

type Props = {
  roleId?: string;
};

export function RoleEditPage({ roleId: roleIdProp }: Props = {}) {
  const params = useParams<{ roleId: string }>();
  const roleId = roleIdProp ?? params.roleId;
  const { access } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [serverError, setServerError] = useState<unknown>();
  const [pendingValues, setPendingValues] =
    useState<RoleFormValues | null>(null);
  const allowed = canEditRole(access);
  const roleQuery = useRoleDetail(roleId, allowed);
  const updateMutation = useUpdateRole(roleId ?? '');

  if (!access || (allowed && roleQuery.isLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !allowed ||
    (roleQuery.error && isForbiddenError(roleQuery.error))
  ) {
    return (
      <PermissionDenied
        error={roleQuery.error}
        title="Role edit unavailable"
        message="You need both role.view and role.update."
      />
    );
  }

  if (roleQuery.error || !roleQuery.data) {
    return (
      <RetryPanel
        error={roleQuery.error ?? new Error('Role not found')}
        onRetry={() => void roleQuery.refetch()}
        forceRetry
      />
    );
  }

  const role = roleQuery.data;
  const allowBypass =
    Boolean(access.bypassPermissions) &&
    !(role.isSystem && role.bypassPermissions);

  const update = async (values: RoleFormValues) => {
    setServerError(undefined);
    try {
      await updateMutation.mutateAsync(
        toUpdateRoleInput(values, allowBypass),
      );
      setPendingValues(null);
      notify.success('Role updated successfully');
      void navigate(`/administration/roles/${role.id}`);
    } catch (error) {
      setPendingValues(null);
      setServerError(error);
      notify.error('Role could not be updated');
    }
  };

  const submit = (values: RoleFormValues) => {
    if (
      allowBypass &&
      values.bypassPermissions !== role.bypassPermissions
    ) {
      setPendingValues(values);
      return;
    }
    void update(values);
  };

  return (
    <>
      <Stack spacing={2.5} data-testid="role-edit-page">
        <Stack spacing={0.5}>
          <Typography variant="h5">Edit {role.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {role.code} · permission assignment and status changes are
            managed from the role detail page.
          </Typography>
        </Stack>
        {role.isSystem ? (
          <Alert severity="info">
            This is a system role. Its code is immutable, and bypass cannot be
            removed from the Super Admin role.
          </Alert>
        ) : null}
        <RoleForm
          mode="edit"
          initial={role}
          allowBypass={allowBypass}
          submitting={updateMutation.isPending}
          serverError={serverError}
          onSubmit={submit}
          onCancel={() =>
            void navigate(`/administration/roles/${role.id}`)
          }
        />
      </Stack>

      <ConfirmDialog
        open={Boolean(pendingValues)}
        title={
          pendingValues?.bypassPermissions
            ? 'Grant permission bypass?'
            : 'Remove permission bypass?'
        }
        description={
          pendingValues?.bypassPermissions
            ? 'This role will bypass every permission check and grant unrestricted access.'
            : 'Users with only this role will immediately lose bypass access.'
        }
        confirmLabel="Change bypass"
        destructive
        loading={updateMutation.isPending}
        onCancel={() => setPendingValues(null)}
        onConfirm={() => {
          if (pendingValues) void update(pendingValues);
        }}
      />
    </>
  );
}
