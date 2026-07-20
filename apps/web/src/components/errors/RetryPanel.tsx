import { Button, Stack } from '@mui/material';
import { toAppError } from '@/api/errors';
import { ErrorAlert } from './ErrorAlert';
import { PermissionDenied } from './PermissionDenied';
import { EmptyState } from './EmptyState';

type Props = {
  error: unknown;
  onRetry?: () => void;
  /** Label for the retry button when the error is retryable. */
  retryLabel?: string;
  /** Force showing retry even when the error is not classified retryable. */
  forceRetry?: boolean;
};

/**
 * Query/mutation failure panel: permission → PermissionDenied,
 * not found → EmptyState, otherwise ErrorAlert + optional Retry.
 */
export function RetryPanel({
  error,
  onRetry,
  retryLabel = 'Try again',
  forceRetry = false,
}: Props) {
  const appError = toAppError(error);

  if (appError.kind === 'forbidden') {
    return <PermissionDenied error={appError} />;
  }

  if (appError.kind === 'not_found') {
    return (
      <EmptyState
        title={appError.title}
        description={appError.message}
        actionLabel={onRetry ? retryLabel : undefined}
        onAction={onRetry}
      />
    );
  }

  const showRetry = Boolean(onRetry) && (forceRetry || appError.retryable);

  return (
    <Stack spacing={1.5}>
      <ErrorAlert error={appError} />
      {showRetry ? (
        <Button
          variant="contained"
          onClick={onRetry}
          sx={{ alignSelf: 'flex-start' }}
        >
          {retryLabel}
        </Button>
      ) : null}
    </Stack>
  );
}
