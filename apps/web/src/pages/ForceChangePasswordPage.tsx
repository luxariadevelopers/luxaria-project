import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { changePasswordRequest } from '@/api/auth';
import { getErrorMessage, useAuth } from '@/auth/AuthContext';
import { FormTextField } from '@/components/forms';
import { useNotify } from '@/components/NotificationProvider';

const schema = z
  .object({
    temporaryPassword: z
      .string()
      .min(8, 'Enter the temporary password you signed in with'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
    if (
      values.temporaryPassword &&
      values.newPassword &&
      values.temporaryPassword === values.newPassword
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'New password must be different from the temporary password',
        path: ['newPassword'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function ForceChangePasswordPage() {
  const { user, isAuthenticated, isBootstrapping, logout } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, setError, clearErrors } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      temporaryPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onSubmit',
  });

  if (!isBootstrapping && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isBootstrapping && isAuthenticated && !user?.mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    // Client-side guard — never call the API if the new password matches the temp one.
    if (values.temporaryPassword === values.newPassword) {
      setError('newPassword', {
        type: 'validate',
        message:
          'New password must be different from the temporary password',
      });
      return;
    }

    setSubmitting(true);
    setServerError(null);
    clearErrors('newPassword');
    try {
      await changePasswordRequest({
        newPassword: values.newPassword,
        currentPassword: values.temporaryPassword,
      });
      notify.success(
        'Permanent password saved. Sign in again with your new password.',
      );
      await logout();
      void navigate('/login', { replace: true });
    } catch (error) {
      const message = getErrorMessage(error, 'Could not change password');
      setServerError(message);
      if (/temporary password|current password/i.test(message)) {
        setError(
          /current password is incorrect/i.test(message)
            ? 'temporaryPassword'
            : 'newPassword',
          { type: 'server', message },
        );
      }
      notify.error(message);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      noValidate
      data-testid="force-change-password-page"
      autoComplete="off"
    >
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography variant="h5">Set your permanent password</Typography>
          <Typography variant="body2" color="text.secondary">
            You signed in with a temporary password. Choose a new permanent
            password to continue.
          </Typography>
        </Stack>
        <Alert severity="info">
          Enter the temporary password you signed in with, then a new permanent
          password that is different from it (at least 8 characters).
        </Alert>
        {serverError ? <Alert severity="error">{serverError}</Alert> : null}
        <FormTextField
          name="temporaryPassword"
          control={control}
          label="Temporary password"
          type="password"
          autoComplete="current-password"
          required
        />
        <FormTextField
          name="newPassword"
          control={control}
          label="New password"
          type="password"
          autoComplete="new-password"
          required
        />
        <FormTextField
          name="confirmPassword"
          control={control}
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
        />
        <Stack direction="row" spacing={1.5}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save permanent password'}
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void logout()}
          >
            Sign out
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
