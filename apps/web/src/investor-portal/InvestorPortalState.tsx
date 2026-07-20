import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { isForbiddenError } from '@/api/client';
import { PermissionDenied } from '@/components/errors/PermissionDenied';
import { isInvestorPortalAccessError } from './api';

type Props = {
  isLoading: boolean;
  error: unknown;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onRetry?: () => void;
  children: ReactNode;
};

export function InvestorPortalState({
  isLoading,
  error,
  isEmpty,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
}: Props) {
  if (isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }} spacing={2}>
        <CircularProgress size={32} />
        <Typography color="text.secondary">Loading investor portal…</Typography>
      </Stack>
    );
  }

  if (
    error &&
    (isForbiddenError(error) || isInvestorPortalAccessError(error))
  ) {
    return (
      <PermissionDenied
        title="Investor portal unavailable"
        message={
          isInvestorPortalAccessError(error)
            ? error.message
            : 'You need investor_portal.view and a linked investor profile.'
        }
        error={error}
      />
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
      >
        {(error as Error).message || 'Failed to load investor portal data'}
      </Alert>
    );
  }

  if (isEmpty) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography variant="h6">{emptyTitle}</Typography>
          <Typography color="text.secondary">{emptyDescription}</Typography>
        </Stack>
      </Paper>
    );
  }

  return <>{children}</>;
}
