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
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { canEditUser } from './roleAccess';
import { UserForm } from './UserForm';
import {
  useUpdateUser,
  useUserDetail,
  useUsersList,
} from './useUsers';
import {
  toUpdateUserInput,
  type UserFormValues,
} from './validation';

type Props = {
  userId?: string;
};

export function UserEditPage({ userId: userIdProp }: Props = {}) {
  const params = useParams<{ userId: string }>();
  const userId = userIdProp ?? params.userId;
  const { access } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [serverError, setServerError] = useState<unknown>();
  const allowed = canEditUser(access);

  const userQuery = useUserDetail(userId, allowed);
  const managersQuery = useUsersList(
    {
      page: 1,
      limit: 100,
      status: 'active',
      sortBy: 'fullName',
      sortOrder: 'asc',
    },
    allowed,
  );
  const updateMutation = useUpdateUser(userId ?? '');

  if (!access || (allowed && userQuery.isLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !allowed ||
    (userQuery.error && isForbiddenError(userQuery.error))
  ) {
    return (
      <PermissionDenied
        error={userQuery.error}
        title="User edit unavailable"
        message="You need both user.view and user.update."
      />
    );
  }

  if (userQuery.error || !userQuery.data) {
    return (
      <RetryPanel
        error={userQuery.error ?? new Error('User not found')}
        onRetry={() => void userQuery.refetch()}
        forceRetry
      />
    );
  }

  const user = userQuery.data;
  const submit = async (values: UserFormValues) => {
    setServerError(undefined);
    try {
      await updateMutation.mutateAsync(toUpdateUserInput(values));
      notify.success('User updated successfully');
      void navigate(`/users/${user.id}`);
    } catch (error) {
      setServerError(error);
      notify.error('User could not be updated');
    }
  };

  return (
    <Stack spacing={2.5} data-testid="user-edit-page">
      <Stack spacing={0.5}>
        <Typography variant="h5">Edit {user.fullName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {user.userCode} · status, password, roles, and projects are managed
          from the user detail page.
        </Typography>
      </Stack>
      {managersQuery.error ? (
        <Alert severity="info">
          Reporting-manager choices are unavailable. The current value will
          be preserved.
        </Alert>
      ) : null}
      <UserForm
        mode="edit"
        initial={user}
        managerOptions={
          managersQuery.isSuccess ? managersQuery.data.items : undefined
        }
        submitting={updateMutation.isPending}
        serverError={serverError}
        onSubmit={submit}
        onCancel={() => void navigate(`/users/${user.id}`)}
      />
    </Stack>
  );
}
