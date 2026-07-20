import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import type { VendorListRow } from './types';

type Props = {
  open: boolean;
  vendor: VendorListRow | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string | null) => void;
};

export function BlockVendorDialog({
  open,
  vendor,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      data-testid="block-vendor-dialog"
    >
      <DialogTitle>Block vendor</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Block {vendor?.legalName ?? 'this vendor'} ({vendor?.vendorCode})?
          Blocked vendors cannot be activated until the block is cleared on the
          server.
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={2}
          slotProps={{
            htmlInput: {
              maxLength: 500,
              'data-testid': 'block-vendor-reason',
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={loading}
          onClick={() => onConfirm(reason.trim() || null)}
          data-testid="block-vendor-confirm"
        >
          {loading ? 'Blocking…' : 'Block'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
