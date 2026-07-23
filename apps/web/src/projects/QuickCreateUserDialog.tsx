import { useMemo, useState } from 'react';
import {
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { createUser, uploadUserProfilePhoto } from '@/user-admin/api';
import {
  UserForm,
  type UserFormSubmitExtras,
} from '@/user-admin/UserForm';
import type { PublicUser } from '@/user-admin/types';
import {
  toCreateUserInput,
  type UserFormValues,
} from '@/user-admin/validation';
import { useUsersList } from '@/user-admin/useUsers';

type Props = {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onCreated: (user: PublicUser) => void | Promise<void>;
};

/**
 * Full create-user dialog for project team assign (same fields as Users → Create).
 */
export function QuickCreateUserDialog({
  open,
  submitting = false,
  onClose,
  onCreated,
}: Props) {
  const { hasPermission } = useAuth();
  const [serverError, setServerError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const busy = submitting || saving;

  const managersQuery = useUsersList(
    {
      page: 1,
      limit: 100,
      status: 'active',
      sortBy: 'fullName',
      sortOrder: 'asc',
    },
    open && hasPermission('user.view'),
  );

  const managerOptions = useMemo(
    () => managersQuery.data?.items ?? [],
    [managersQuery.data?.items],
  );

  const close = () => {
    if (busy) return;
    setServerError(undefined);
    onClose();
  };

  const handleSubmit = async (
    values: UserFormValues,
    extras: UserFormSubmitExtras,
  ) => {
    setServerError(undefined);
    setSaving(true);
    try {
      const user = await createUser(
        toCreateUserInput(values, {
          includeRoleIds: false,
          includeAssignedProjects: false,
        }),
      );
      if (extras.profilePhotoFile && hasPermission('user.update')) {
        try {
          await uploadUserProfilePhoto(user.id, extras.profilePhotoFile);
        } catch {
          // Assignment still proceeds; photo can be fixed on user edit.
        }
      }
      await onCreated(user);
    } catch (error) {
      setServerError(error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="md"
      scroll="paper"
      data-testid="quick-create-user-dialog"
      // Avoid focus fighting with a parent dialog that was just closed.
      disableRestoreFocus
    >
      <DialogTitle>Add user</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">
            Full user form — login, employment, reporting, and photo. After
            create they are assigned to this project with the team role you
            already chose.
          </Alert>
          {managersQuery.error ? (
            <Typography variant="body2" color="text.secondary">
              Reporting officers list could not be loaded — you can set that
              later on the user edit page.
            </Typography>
          ) : null}
          <UserForm
            mode="create"
            managerOptions={managerOptions}
            submitting={busy}
            serverError={serverError}
            onSubmit={handleSubmit}
            onCancel={close}
          />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
