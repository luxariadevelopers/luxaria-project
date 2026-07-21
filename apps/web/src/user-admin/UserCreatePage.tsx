import { useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProjectsList } from '@/projects/useProjects';
import { RoleStatus } from '@/rbac-admin/types';
import { useRolesList } from '@/rbac-admin/useRbac';
import { canCreateUser } from './roleAccess';
import { UserForm } from './UserForm';
import { useCreateUser, useUsersList } from './useUsers';
import {
  toCreateUserInput,
  type UserFormValues,
} from './validation';

export function UserCreatePage() {
  const { access, hasPermission } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [serverError, setServerError] = useState<unknown>();
  const allowed = canCreateUser(access);
  const allowInitialRoles =
    hasPermission('user.assign_role') && hasPermission('role.view');
  const allowInitialProjects =
    hasPermission('user.assign_project') && hasPermission('project.view');

  const managersQuery = useUsersList(
    {
      page: 1,
      limit: 100,
      status: 'active',
      sortBy: 'fullName',
      sortOrder: 'asc',
    },
    allowed && hasPermission('user.view'),
  );
  const rolesQuery = useRolesList(
    {
      page: 1,
      limit: 100,
      status: RoleStatus.Active,
      sortBy: 'name',
      sortOrder: 'asc',
    },
    allowed && allowInitialRoles,
  );
  const projectsQuery = useProjectsList(
    { page: 1, limit: 100, sortBy: 'projectName', sortOrder: 'asc' },
    allowed && allowInitialProjects,
  );
  const createMutation = useCreateUser();

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
        title="User creation unavailable"
        message="You need the user.create permission to create an account."
      />
    );
  }

  const submit = async (values: UserFormValues) => {
    setServerError(undefined);
    try {
      const user = await createMutation.mutateAsync(
        toCreateUserInput(values, {
          includeRoleIds: allowInitialRoles,
          includeAssignedProjects: allowInitialProjects,
        }),
      );
      notify.success(`User ${user.userCode} created successfully`);
      void navigate(
        hasPermission('user.view') ? `/users/${user.id}` : '/',
        { replace: true },
      );
    } catch (error) {
      setServerError(error);
      notify.error('User could not be created');
    }
  };

  return (
    <Stack spacing={2.5} data-testid="user-create-page">
      <Stack spacing={0.5}>
        <Typography variant="h5">Create user</Typography>
        <Typography variant="body2" color="text.secondary">
          Create a staff account with a one-time entered initial password. No
          invitation endpoint exists in the current API.
        </Typography>
      </Stack>

      {hasPermission('user.assign_role') &&
      !hasPermission('role.view') ? (
        <Alert severity="info">
          Initial role assignment is hidden because role.view is required to
          load valid active roles.
        </Alert>
      ) : null}
      {rolesQuery.error ? (
        <Alert severity="info">
          The active role catalog is unavailable, so this user will be created
          without initial roles.
        </Alert>
      ) : null}
      {hasPermission('user.assign_project') &&
      !hasPermission('project.view') ? (
        <Alert severity="info">
          Initial project assignment is hidden because project.view is
          required to load valid projects.
        </Alert>
      ) : null}
      {projectsQuery.error ? (
        <Alert severity="info">
          The project catalog is unavailable, so initial project assignment is
          hidden.
        </Alert>
      ) : null}
      {managersQuery.error ? (
        <Alert severity="info">
          Reporting-manager selection is unavailable. It can be set later.
        </Alert>
      ) : null}

      <UserForm
        mode="create"
        managerOptions={
          managersQuery.isSuccess ? managersQuery.data.items : undefined
        }
        roleOptions={
          rolesQuery.isSuccess ? rolesQuery.data.items : undefined
        }
        projectOptions={
          projectsQuery.isSuccess ? projectsQuery.data.items : undefined
        }
        allowRoleAssignment={allowInitialRoles}
        allowProjectAssignment={allowInitialProjects}
        submitting={createMutation.isPending}
        serverError={serverError}
        onSubmit={submit}
        onCancel={() =>
          void navigate(hasPermission('user.view') ? '/users' : '/')
        }
      />
    </Stack>
  );
}
