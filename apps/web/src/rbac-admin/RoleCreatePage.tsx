import { useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { PageHeader } from '@/layouts/PageHeader';
import { RoleForm } from './RoleForm';
import {
  canCreateRole,
  canViewPermissionCatalog,
} from './roleAccess';
import { useCreateRole, usePermissionCatalog } from './useRbac';
import {
  toCreateRoleInput,
  type RoleFormValues,
} from './validation';

export function RoleCreatePage() {
  const { access, hasPermission } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [serverError, setServerError] = useState<unknown>();
  const [pendingValues, setPendingValues] =
    useState<RoleFormValues | null>(null);
  const allowed = canCreateRole(access);
  const canReadCatalog = canViewPermissionCatalog(access);
  const allowBypass = Boolean(access?.bypassPermissions);
  const permissionQuery = usePermissionCatalog(
    allowed && canReadCatalog,
  );
  const createMutation = useCreateRole();

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!allowed) {
    return (
      <PermissionDenied
        title="Role creation unavailable"
        message="You need role.create to create a role."
      />
    );
  }

  const create = async (values: RoleFormValues) => {
    setServerError(undefined);
    try {
      const role = await createMutation.mutateAsync(
        toCreateRoleInput(values, {
          includePermissions: canReadCatalog,
          allowBypass,
        }),
      );
      setPendingValues(null);
      notify.success(`Role ${role.code} created successfully`);
      void navigate(
        hasPermission('role.view')
          ? `/administration/roles/${role.id}`
          : '/',
        { replace: true },
      );
    } catch (error) {
      setPendingValues(null);
      setServerError(error);
      notify.error('Role could not be created');
    }
  };

  const submit = (values: RoleFormValues) => {
    if (
      (canReadCatalog && values.permissions.length > 0) ||
      (allowBypass && values.bypassPermissions)
    ) {
      setPendingValues(values);
      return;
    }
    void create(values);
  };

  return (
    <>
      <Stack spacing={2.5} data-testid="role-create-page">
        <PageHeader
          title="Create role"
          subtitle="Create role metadata and optionally select permissions from the server catalog."
        />
        {!canReadCatalog ? (
          <Alert severity="info">
            permission.view is required to load and select initial
            permissions. The role can still be created with no permissions.
          </Alert>
        ) : null}
        {permissionQuery.error ? (
          <Alert severity="error">
            The permission catalog is unavailable. Initial permissions are
            hidden so unknown codes cannot be submitted.
          </Alert>
        ) : null}
        <RoleForm
          mode="create"
          permissionCatalog={
            permissionQuery.isSuccess ? permissionQuery.data : undefined
          }
          allowBypass={allowBypass}
          submitting={createMutation.isPending}
          serverError={serverError}
          onSubmit={submit}
          onCancel={() =>
            void navigate(hasPermission('role.view') ? '/administration/roles' : '/')
          }
        />
      </Stack>

      <ConfirmDialog
        open={Boolean(pendingValues)}
        title="Create this access role?"
        description={
          pendingValues?.bypassPermissions
            ? 'This role will bypass every permission check. Confirm only for a trusted administrative role.'
            : `This role will be created with ${pendingValues?.permissions.length ?? 0} selected permissions.`
        }
        confirmLabel="Create role"
        destructive={Boolean(pendingValues?.bypassPermissions)}
        loading={createMutation.isPending}
        onCancel={() => setPendingValues(null)}
        onConfirm={() => {
          if (pendingValues) void create(pendingValues);
        }}
      />
    </>
  );
}
