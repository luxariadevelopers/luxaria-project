import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useVerifyInvestorKyc } from './useInvestors';

type Props = {
  investor: { id: string; legalName: string } | null;
  verified: boolean;
  open: boolean;
  onClose: () => void;
};

export function VerifyKycDialog({
  investor,
  verified,
  open,
  onClose,
}: Props) {
  const [notes, setNotes] = useState('');
  const mutation = useVerifyInvestorKyc();
  const { success, error: notifyError } = useNotify();

  const submit = async () => {
    if (!investor) return;
    try {
      await mutation.mutateAsync({
        id: investor.id,
        input: {
          verified,
          notes: notes.trim() || null,
        },
      });
      success(verified ? 'KYC verified' : 'KYC rejected');
      setNotes('');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {verified ? 'Verify KYC' : 'Reject KYC'} — {investor?.legalName}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Requires investor.verify_kyc. Backend enforces project/company access.
        </Typography>
        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          helperText="Optional (min 3 characters when provided)"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={verified ? 'success' : 'error'}
          disabled={mutation.isPending}
          onClick={() => void submit()}
        >
          {mutation.isPending
            ? 'Saving…'
            : verified
              ? 'Confirm verify'
              : 'Confirm reject'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
