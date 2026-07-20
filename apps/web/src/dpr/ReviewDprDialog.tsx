import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reviewNotes: string) => void;
};

export function ReviewDprDialog({
  open,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) setNotes('');
  }, [open]);

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Review daily progress report</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label="Review notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={loading}
          onClick={() => onConfirm(notes)}
        >
          Mark reviewed
        </Button>
      </DialogActions>
    </Dialog>
  );
}
