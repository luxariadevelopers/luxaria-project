import { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { formDrawerPaperSx } from '@/components/forms';
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
    <Drawer
      anchor="right"
      open={open}
      onClose={loading ? undefined : onClose}
      slotProps={{ paper: { sx: formDrawerPaperSx(440) } }}
    >
      <Box
        component="form"
        id="clone-role-form"
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        sx={{
          p: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack spacing={2} sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Typography variant="h6">Clone role</Typography>
          <Typography variant="body2" color="text.secondary">
            Permissions are copied from {sourceName}. Permission bypass is
            never copied by the server.
          </Typography>
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
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Cloning…' : 'Clone role'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
