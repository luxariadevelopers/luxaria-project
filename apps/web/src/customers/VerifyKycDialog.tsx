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
import { useVerifyCustomerKyc } from './useCustomers';

type Props = {
  customer: { id: string; fullName: string } | null;
  verified: boolean;
  open: boolean;
  onClose: () => void;
};

export function VerifyKycDialog({
  customer,
  verified,
  open,
  onClose,
}: Props) {
  const [notes, setNotes] = useState('');
  const mutation = useVerifyCustomerKyc();
  const { success, error: notifyError } = useNotify();

  const submit = async () => {
    if (!customer) return;
    try {
      await mutation.mutateAsync({
        id: customer.id,
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
        {verified ? 'Verify KYC' : 'Reject KYC'} — {customer?.fullName}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Requires customer.manage. Backend enforces KYC and activation rules.
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
              ? 'Verify'
              : 'Reject'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
