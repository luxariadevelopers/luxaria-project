import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Stack } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage, useAuth } from '@/auth/AuthContext';
import { FormTextField } from '@/components/forms';
import { useNotify } from '@/components/NotificationProvider';
import { investorHomePath, isInvestorOnlySession } from '@/investor-portal/session';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or mobile is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function isTemporaryPasswordLoginHint(message: string): boolean {
  return /temporary password/i.test(message);
}

export function LoginPage() {
  const { login, isAuthenticated, isBootstrapping, access, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { success } = useNotify();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  if (!isBootstrapping && isAuthenticated) {
    if (user?.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    if (access && isInvestorOnlySession(access)) {
      return <Navigate to={investorHomePath()} replace />;
    }
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const nextUser = await login({
        identifier: values.identifier.trim(),
        // Trim — browser autofill sometimes appends a trailing space
        password: values.password.trim(),
        deviceName: navigator.userAgent.slice(0, 80),
      });
      success('Welcome back');
      if (nextUser.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }
      const from =
        (location.state as { from?: { pathname?: string } } | null)?.from
          ?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      const message = getErrorMessage(err, 'Invalid email/mobile or password');
      const temporaryPasswordHint = isTemporaryPasswordLoginHint(message);
      setFormError(message);
      setError('password', {
        type: 'server',
        message: temporaryPasswordHint
          ? 'Use the temporary password set by an admin — not your old one.'
          : 'Invalid password',
      });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Box component="form" onSubmit={onSubmit} noValidate autoComplete="off">
      <Stack spacing={2.5}>
        {formError ? (
          <Alert
            severity={
              isTemporaryPasswordLoginHint(formError) ? 'info' : 'error'
            }
          >
            {formError}
          </Alert>
        ) : null}
        <FormTextField
          name="identifier"
          control={control}
          label="Email or mobile"
          autoComplete="off"
          autoFocus
        />
        <FormTextField
          name="password"
          control={control}
          label="Password"
          type="password"
          autoComplete="off"
        />
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
    </Box>
  );
}
