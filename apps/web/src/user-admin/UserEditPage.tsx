import { useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { PageHeader } from '@/layouts/PageHeader';
import { canEditUser } from './roleAccess';
import { UserForm, type UserFormSubmitExtras } from './UserForm';
import {
  useUpdateUser,
  useUploadUserProfilePhoto,
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
  const photoMutation = useUploadUserProfilePhoto(userId ?? '');

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
  const submit = async (
    values: UserFormValues,
    extras: UserFormSubmitExtras,
  ) => {
    setServerError(undefined);
    try {
      await updateMutation.mutateAsync(toUpdateUserInput(values));
      if (extras.profilePhotoFile) {
        await photoMutation.mutateAsync(extras.profilePhotoFile);
      }
      notify.success('User updated successfully');
      void navigate(`/users/${user.id}`);
    } catch (error) {
      setServerError(error);
      notify.error('User could not be updated');
    }
  };

  return (
    <Stack spacing={2.5} data-testid="user-edit-page">
      <PageHeader
        title={`Edit ${user.fullName}`}
        subtitle={`${user.userCode} · set login, temporary password, reporting officers, and profile photo here. Roles and projects stay on the user detail page.`}
      />
      {managersQuery.error ? (
        <Alert severity="warning">
          Could not load the full staff list for reporting officers. Retry or
          save without changing reporting.
        </Alert>
      ) : null}
      <UserForm
        mode="edit"
        initial={user}
        managerOptions={managersQuery.data?.items ?? []}
        submitting={updateMutation.isPending || photoMutation.isPending}
        serverError={serverError}
        onSubmit={submit}
        onCancel={() => void navigate(`/users/${user.id}`)}
      />
    </Stack>
  );
}
