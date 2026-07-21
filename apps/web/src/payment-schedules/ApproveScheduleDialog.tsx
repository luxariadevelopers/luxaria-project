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
import { useApprovePaymentSchedule } from './usePaymentSchedules';

type Props = {
  open: boolean;
  onClose: () => void;
  scheduleId: string | null;
  scheduleNumber?: string;
};

export function ApproveScheduleDialog({
  open,
  onClose,
  scheduleId,
  scheduleNumber,
}: Props) {
  const approve = useApprovePaymentSchedule();
  const { success, error: notifyError } = useNotify();
  const [comment, setComment] = useState('');

  const handleClose = () => {
    setComment('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!scheduleId) return;
    try {
      const updated = await approve.mutateAsync({
        id: scheduleId,
        input: { comment: comment.trim() || null },
      });
      success(`Approved ${updated.scheduleNumber}`);
      handleClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'Approve failed'));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Approve payment schedule</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Comment (optional)"
          fullWidth
          multiline
          minRows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={approve.isPending}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={approve.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={() => void handleSubmit()}
          disabled={approve.isPending || !scheduleId}
        >
          Approve{scheduleNumber ? ` ${scheduleNumber}` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
