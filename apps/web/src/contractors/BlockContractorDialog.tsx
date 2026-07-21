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
import type { ContractorListRow } from './types';

type Props = {
  open: boolean;
  contractor: ContractorListRow | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function BlockContractorDialog({
  open,
  contractor,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const trimmed = reason.trim();
  const canSubmit = trimmed.length >= 3;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      data-testid="block-contractor-dialog"
    >
      <DialogTitle>Blacklist contractor</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Blacklist {contractor?.legalName ?? 'this contractor'} from new
          assignments. Existing agreements are unchanged. A reason is required
          for audit.
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          required
          label="Reason"
          helperText="Minimum 3 characters"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={loading || !canSubmit}
          onClick={() => onConfirm(trimmed)}
        >
          Blacklist
        </Button>
      </DialogActions>
    </Dialog>
  );
}
