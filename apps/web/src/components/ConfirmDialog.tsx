import { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { blurActiveElement } from '@/utils/blurActiveElement';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (open) blurActiveElement();
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      disableRestoreFocus
    >
      <DialogTitle>{title}</DialogTitle>
      {description ? (
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
      ) : null}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading} autoFocus={!destructive}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          onClick={onConfirm}
          disabled={loading}
          autoFocus={destructive}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
