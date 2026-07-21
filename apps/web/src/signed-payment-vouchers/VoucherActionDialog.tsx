import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
} from '@mui/material';
import Checkbox from '@mui/material/Checkbox';

export type VoucherDialogMode = 'reverse' | 'cancel' | null;

type Props = {
  mode: VoucherDialogMode;
  voucherNumber?: string;
  loading?: boolean;
  onConfirm: (input: {
    reason: string;
    createReplacement?: boolean;
  }) => void;
  onClose: () => void;
};

export function VoucherActionDialog({
  mode,
  voucherNumber,
  loading,
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState('');
  const [createReplacement, setCreateReplacement] = useState(true);

  const open = mode != null;
  const title =
    mode === 'reverse'
      ? 'Reverse posted voucher'
      : mode === 'cancel'
        ? 'Cancel voucher'
        : '';

  const handleClose = () => {
    setReason('');
    setCreateReplacement(true);
    onClose();
  };

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm({
      reason: reason.trim(),
      createReplacement: mode === 'reverse' ? createReplacement : undefined,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {voucherNumber ? (
            <TextField
              label="Voucher"
              value={voucherNumber}
              slotProps={{ input: { readOnly: true } }}
              size="small"
            />
          ) : null}
          <TextField
            label={mode === 'cancel' ? 'Cancellation reason' : 'Reversal reason'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            multiline
            minRows={3}
            autoFocus
          />
          {mode === 'reverse' ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={createReplacement}
                  onChange={(e) => setCreateReplacement(e.target.checked)}
                />
              }
              label="Create replacement draft voucher"
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Close
        </Button>
        <Button
          variant="contained"
          color={mode === 'cancel' ? 'warning' : 'error'}
          onClick={handleConfirm}
          disabled={loading || !reason.trim()}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
