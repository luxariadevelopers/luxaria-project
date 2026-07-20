import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

export type BillDialogMode = 'reject' | 'note' | null;

type Props = {
  open: boolean;
  mode: BillDialogMode;
  billNumber?: string;
  loading?: boolean;
  title?: string;
  onClose: () => void;
  onReject?: (reason: string) => Promise<void>;
  onConfirmNote?: (notes: string | null) => Promise<void>;
};

export function BillActionDialog({
  open,
  mode,
  billNumber,
  loading,
  title,
  onClose,
  onReject,
  onConfirmNote,
}: Props) {
  const [text, setText] = useState('');

  const handleClose = () => {
    if (loading) return;
    setText('');
    onClose();
  };

  const heading =
    title ??
    (mode === 'reject'
      ? `Reject ${billNumber ?? 'bill'}`
      : `Confirm action on ${billNumber ?? 'bill'}`);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      data-testid="bill-action-dialog"
    >
      <DialogTitle>{heading}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          margin="dense"
          label={mode === 'reject' ? 'Reason (required)' : 'Notes (optional)'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
          data-testid="bill-action-text"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={mode === 'reject' ? 'error' : 'primary'}
          disabled={
            loading || (mode === 'reject' && text.trim().length < 3)
          }
          onClick={() => {
            void (async () => {
              if (mode === 'reject') {
                await onReject?.(text.trim());
              } else {
                await onConfirmNote?.(text.trim() || null);
              }
              setText('');
            })();
          }}
          data-testid="bill-action-confirm"
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
