import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Stack } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage, useAuth } from '@/auth/AuthContext';
import { FormTextField } from '@/components/forms';
import { useNotify } from '@/components/NotificationProvider';
import {
  hasInvestorPortalAccess,
  investorHomePath,
} from './session';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or mobile is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function InvestorLoginPage() {
  const { login, isAuthenticated, isBootstrapping, access } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { error, success } = useNotify();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  if (!isBootstrapping && isAuthenticated && access) {
    if (hasInvestorPortalAccess(access)) {
      const from =
        (location.state as { from?: { pathname?: string } } | null)?.from
          ?.pathname ?? investorHomePath();
      return <Navigate to={from.startsWith('/investor') ? from : investorHomePath()} replace />;
    }
    return <Navigate to="/investor/forbidden" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await login({
        identifier: values.identifier.trim(),
        password: values.password,
        deviceName: navigator.userAgent.slice(0, 80),
      });
      success('Welcome to the investor portal');
      const from =
        (location.state as { from?: { pathname?: string } } | null)?.from
          ?.pathname ?? investorHomePath();
      navigate(from.startsWith('/investor') ? from : investorHomePath(), {
        replace: true,
      });
    } catch (err) {
      error(getErrorMessage(err, 'Invalid credentials'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Box component="form" onSubmit={onSubmit} noValidate data-testid="investor-login-form">
      <Stack spacing={2.5}>
        <FormTextField
          name="identifier"
          control={control}
          label="Email or mobile"
          autoComplete="username"
          autoFocus
        />
        <FormTextField
          name="password"
          control={control}
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
    </Box>
  );
}
