import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { validateReopenPayload } from './validation';

type Props = {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

export function ReopenDprDialog({
  open,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Reopen daily progress report</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Provide a reason so the site team knows what to correct. Reopen is
          gated by `dpr.review` on the backend.
        </Typography>
        <TextField
          autoFocus
          required
          fullWidth
          multiline
          minRows={3}
          label="Reason"
          value={reason}
          error={Boolean(error)}
          helperText={error ?? 'Required — sent as `{ reason }` per API DTO'}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          disabled={loading}
          onClick={() => {
            const parsed = validateReopenPayload(reason);
            if (!parsed.ok) {
              setError(parsed.message);
              return;
            }
            onConfirm(parsed.payload.reason);
          }}
        >
          Reopen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
