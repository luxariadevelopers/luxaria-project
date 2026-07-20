import { Alert, AlertTitle, Typography } from '@mui/material';
import type { NormalizedAppError } from '@luxaria/shared-types';
import { toAppError } from '@/api/errors';
import { FieldErrorSummary } from './FieldErrorSummary';

type Props = {
  error: unknown;
  /** Override title from normalised error. */
  title?: string;
  /** Override message from normalised error. */
  message?: string;
  showRequestId?: boolean;
  showDetails?: boolean;
};

/** Inline alert for API / validation failures (not permission-denied full page). */
export function ErrorAlert({
  error,
  title,
  message,
  showRequestId = true,
  showDetails = true,
}: Props) {
  const appError: NormalizedAppError = toAppError(error);
  const severity =
    appError.kind === 'forbidden' || appError.kind === 'unauthorized'
      ? 'warning'
      : 'error';

  return (
    <Alert severity={severity} variant="outlined">
      <AlertTitle>{title ?? appError.title}</AlertTitle>
      <Typography variant="body2">{message ?? appError.message}</Typography>
      {showDetails ? <FieldErrorSummary error={appError} /> : null}
      {showRequestId && appError.requestId ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: 'block' }}
        >
          Reference: {appError.requestId}
        </Typography>
      ) : null}
    </Alert>
  );
}
