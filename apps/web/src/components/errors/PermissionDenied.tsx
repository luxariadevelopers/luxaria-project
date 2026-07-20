import { Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { getErrorMessage } from '@/api/client';

type Props = {
  error?: unknown;
  title?: string;
  message?: string;
  showHomeLink?: boolean;
};

export function PermissionDenied({
  error,
  title,
  message,
  showHomeLink = true,
}: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="h5">{title ?? 'Access denied'}</Typography>
        <Typography color="text.secondary">
          {message ??
            (error ? getErrorMessage(error) : undefined) ??
            'You do not have permission to view this content.'}
        </Typography>
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
