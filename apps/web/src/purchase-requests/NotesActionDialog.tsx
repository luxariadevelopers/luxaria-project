import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

type Props = {
  open: boolean;
  title: string;
  confirmLabel: string;
  fieldLabel: string;
  required?: boolean;
  confirmColor?: 'primary' | 'error' | 'warning' | 'success';
  onClose: () => void;
  onConfirm: (notes: string) => void | Promise<void>;
  loading?: boolean;
};

/**
 * Shared notes/reason dialog for review, reject, and return.
 */
export function NotesActionDialog({
  open,
  title,
  confirmLabel,
  fieldLabel,
  required = false,
  confirmColor = 'primary',
  onClose,
  onConfirm,
  loading = false,
}: Props) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNotes('');
      setError(null);
    }
  }, [open]);

  const busy = loading || submitting;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      data-testid="purchase-request-notes-dialog"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          label={fieldLabel}
          multiline
          minRows={2}
          fullWidth
          required={required}
          disabled={busy}
          error={Boolean(error)}
          helperText={error}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          disabled={busy}
          onClick={() => {
            const trimmed = notes.trim();
            if (required && !trimmed) {
              setError(`${fieldLabel} is required`);
              return;
            }
            setSubmitting(true);
            void (async () => {
              try {
                await onConfirm(trimmed);
                onClose();
              } finally {
                setSubmitting(false);
              }
            })();
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
