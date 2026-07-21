import { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import {
  cloneRoleSchema,
  type CloneRoleFormValues,
} from './validation';

type Props = {
  open: boolean;
  sourceName: string;
  loading?: boolean;
  serverError?: unknown;
  onClose: () => void;
  onSubmit: (values: CloneRoleFormValues) => void | Promise<void>;
};

export function CloneRoleDialog({
  open,
  sourceName,
  loading = false,
  serverError,
  onClose,
  onSubmit,
}: Props) {
  const { control, handleSubmit, reset } =
    useForm<CloneRoleFormValues>({
      resolver: zodResolver(cloneRoleSchema),
      defaultValues: {
        name: `${sourceName} Copy`,
        code: '',
        description: '',
      },
    });

  useEffect(() => {
    if (open) {
      reset({
        name: `${sourceName} Copy`,
        code: '',
        description: '',
      });
    }
  }, [open, reset, sourceName]);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Clone role</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="clone-role-form"
          spacing={2}
          sx={{ pt: 0.5 }}
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
        >
          <DialogContentText>
            Permissions are copied from {sourceName}. Permission bypass is
            never copied by the server.
          </DialogContentText>
          {serverError ? (
            <Alert severity="error">
              {getErrorMessage(serverError, 'Role clone failed')}
            </Alert>
          ) : null}
          <FormTextField
            name="name"
            control={control}
            label="New role name"
            required
          />
          <FormTextField
            name="code"
            control={control}
            label="New role code"
            helperText="Optional; leave empty for a generated code."
          />
          <FormTextField
            name="description"
            control={control}
            label="Description"
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="clone-role-form"
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Cloning…' : 'Clone role'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
