import {
  Alert,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import type { SendDigestResult } from './types';

type Props = {
  date: string;
  force: boolean;
  onDateChange: (date: string) => void;
  onForceChange: (force: boolean) => void;
  onSend: () => void;
  onRunJob: () => void;
  sending?: boolean;
  running?: boolean;
  lastResult?: SendDigestResult | null;
  error?: unknown;
};

export function DigestAdminPanel({
  date,
  force,
  onDateChange,
  onForceChange,
  onSend,
  onRunJob,
  sending,
  running,
  lastResult,
  error,
}: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="director-digest-admin">
      <Stack spacing={2}>
        <Typography variant="h6">Send & schedule</Typography>
        <Typography variant="body2" color="text.secondary">
          Requires <code>director_digest.send</code>. Defaults to yesterday (UTC)
          when the date is empty.
        </Typography>

        <TextField
          size="small"
          type="date"
          label="Digest date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 220 }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={force}
              onChange={(e) => onForceChange(e.target.checked)}
            />
          }
          label="Force re-send (skip idempotency)"
        />

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={
              sending ? <CircularProgress size={16} /> : <SendOutlinedIcon />
            }
            onClick={onSend}
            disabled={sending || running}
          >
            Send digests
          </Button>
          <Button
            variant="outlined"
            startIcon={
              running ? <CircularProgress size={16} /> : <PlayArrowOutlinedIcon />
            }
            onClick={onRunJob}
            disabled={sending || running}
          >
            Run scheduled job
          </Button>
        </Stack>

        {error ? (
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Operation failed'}
          </Alert>
        ) : null}

        {lastResult ? (
          <Alert severity={lastResult.failedCount > 0 ? 'warning' : 'success'}>
            Sent {lastResult.sentCount}, failed {lastResult.failedCount} for{' '}
            {lastResult.digestDate}.
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
}
