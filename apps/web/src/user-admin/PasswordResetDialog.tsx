import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';

type Props = {
  open: boolean;
  userName: string;
  loading?: boolean;
  serverError?: unknown;
  onClose: () => void;
  onConfirm: (temporaryPassword: string) => void | Promise<void>;
};

export function PasswordResetDialog({
  open,
  userName,
  loading = false,
  serverError,
  onClose,
  onConfirm,
}: Props) {
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    if (!open) {
      setPassword('');
      setFieldError('');
    }
  }, [open]);

  const close = () => {
    setPassword('');
    setFieldError('');
    onClose();
  };

  const submit = async () => {
    if (password.length < 8) {
      setFieldError('Temporary password must be at least 8 characters');
      return;
    }
    setFieldError('');
    const requestPassword = password;
    try {
      await onConfirm(requestPassword);
    } finally {
      // Never retain or re-render a submitted temporary password.
      setPassword('');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : close}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Reset {userName}&apos;s password?</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <DialogContentText>
            This replaces the password and revokes every active session for
            this user. Share the temporary value through an approved secure
            channel. On next login they must set a new permanent password.
          </DialogContentText>
          {serverError ? (
            <Alert severity="error">
              {getErrorMessage(serverError, 'Password reset failed')}
            </Alert>
          ) : null}
          <TextField
            label="Temporary password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={Boolean(fieldError)}
            helperText={fieldError || 'Minimum 8 characters'}
            disabled={loading}
            required
            fullWidth
            slotProps={{
              htmlInput: {
                minLength: 8,
                'data-testid': 'reset-user-password',
              },
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={() => void submit()}
          disabled={loading || password.length < 8}
        >
          {loading ? 'Resetting…' : 'Reset password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
