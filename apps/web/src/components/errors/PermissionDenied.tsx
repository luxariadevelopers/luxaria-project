import { Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { NormalizedAppError } from '@luxaria/shared-types';
import { toAppError } from '@/api/errors';

type Props = {
  error?: unknown;
  title?: string;
  message?: string;
  showHomeLink?: boolean;
};

/**
 * 403 / project-access surface. Prefer this over hiding UI alone —
 * route guards still apply; this explains the backend denial.
 */
export function PermissionDenied({
  error,
  title,
  message,
  showHomeLink = true,
}: Props) {
  const normalised: NormalizedAppError | null = error
    ? toAppError(error)
    : null;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="h5">
          {title ?? normalised?.title ?? 'Access denied'}
        </Typography>
        <Typography color="text.secondary">
          {message ??
            normalised?.message ??
            'You do not have permission to view this content.'}
        </Typography>
        {normalised?.requestId ? (
          <Typography variant="caption" color="text.disabled">
            Reference: {normalised.requestId}
          </Typography>
        ) : null}
        {showHomeLink ? (
          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            sx={{ alignSelf: 'flex-start' }}
          >
            Back to dashboard
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
