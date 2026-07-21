import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { getErrorMessage } from '@/api/client';
import { useNotify } from '@/components/NotificationProvider';
import { useRejectPaymentSchedule } from './usePaymentSchedules';

type Props = {
  open: boolean;
  onClose: () => void;
  scheduleId: string | null;
  scheduleNumber?: string;
};

export function RejectScheduleDialog({
  open,
  onClose,
  scheduleId,
  scheduleNumber,
}: Props) {
  const reject = useRejectPaymentSchedule();
  const { success, error: notifyError } = useNotify();
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!scheduleId) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      notifyError('Rejection reason is required');
      return;
    }
    try {
      const updated = await reject.mutateAsync({
        id: scheduleId,
        input: { reason: trimmed },
      });
      success(`Rejected ${updated.scheduleNumber}`);
      handleClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'Reject failed'));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reject payment schedule</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Reason"
          fullWidth
          required
          multiline
          minRows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={reject.isPending}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={reject.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => void handleSubmit()}
          disabled={reject.isPending || !scheduleId}
        >
          Reject{scheduleNumber ? ` ${scheduleNumber}` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
