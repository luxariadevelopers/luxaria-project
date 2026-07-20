import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

type InvestorStatePanelProps = {
  title: string;
  message?: string;
  onRetry?: () => void;
};

export function InvestorLoadingState({ title }: { title: string }) {
  return (
    <Box
      sx={{
        minHeight: 240,
        display: 'grid',
        placeItems: 'center',
      }}
      data-testid="investor-loading"
    >
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary">{title}</Typography>
      </Stack>
    </Box>
  );
}

export function InvestorEmptyState({ title, message }: InvestorStatePanelProps) {
  return (
    <Paper variant="outlined" sx={{ p: 4 }} data-testid="investor-empty">
      <Stack spacing={1}>
        <Typography variant="h6">{title}</Typography>
        {message ? (
          <Typography color="text.secondary">{message}</Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function InvestorErrorState({
  title,
  message,
  onRetry,
}: InvestorStatePanelProps) {
  return (
    <Paper variant="outlined" sx={{ p: 4 }} data-testid="investor-error">
      <Stack spacing={2}>
        <Alert severity="error">{title}</Alert>
        {message ? (
          <Typography color="text.secondary">{message}</Typography>
        ) : null}
        {onRetry ? (
          <Button variant="outlined" onClick={onRetry} sx={{ alignSelf: 'flex-start' }}>
            Retry
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function InvestorForbiddenState({
  title = 'Access denied',
  message = 'Your account is not authorised for the investor portal.',
}: Partial<InvestorStatePanelProps>) {
  return (
    <Paper variant="outlined" sx={{ p: 4 }} data-testid="investor-forbidden">
      <Stack spacing={1}>
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary">{message}</Typography>
      </Stack>
    </Paper>
  );
}
