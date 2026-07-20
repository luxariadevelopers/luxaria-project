import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

type QueryStatePanelProps = {
  loading?: boolean;
  error?: unknown;
  empty?: boolean;
  forbidden?: boolean;
  emptyMessage?: string;
  forbiddenMessage?: string;
  onRetry?: () => void;
  children?: ReactNode;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong';
}

export function QueryStatePanel({
  loading,
  error,
  empty,
  forbidden,
  emptyMessage = 'No records to show.',
  forbiddenMessage = 'You do not have access to this resource.',
  onRetry,
  children,
}: QueryStatePanelProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (forbidden) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Alert severity="warning">{forbiddenMessage}</Alert>
          {onRetry ? (
            <Button variant="outlined" onClick={onRetry} sx={{ alignSelf: 'flex-start' }}>
              Retry
            </Button>
          ) : null}
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Alert severity="error">{getErrorMessage(error)}</Alert>
          {onRetry ? (
            <Button variant="outlined" onClick={onRetry} sx={{ alignSelf: 'flex-start' }}>
              Retry
            </Button>
          ) : null}
        </Stack>
      </Paper>
    );
  }

  if (empty) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Paper>
    );
  }

  return <>{children}</>;
}
