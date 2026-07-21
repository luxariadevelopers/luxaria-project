import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/client';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicPaymentScheduleLine } from './types';
import { useMarkScheduleLineDue } from './usePaymentSchedules';

type Props = {
  open: boolean;
  onClose: () => void;
  scheduleId: string | null;
  line: PublicPaymentScheduleLine | null;
};

export function MarkDueDialog({
  open,
  onClose,
  scheduleId,
  line,
}: Props) {
  const markDue = useMarkScheduleLineDue();
  const { success, error: notifyError } = useNotify();
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!line || !open) return;
    setDueDate(line.dueDate?.slice(0, 10) ?? '');
  }, [line, open]);

  const handleClose = () => {
    setDueDate('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!scheduleId || !line) return;
    const trimmed = dueDate.trim();
    if (!trimmed && !line.dueDate) {
      notifyError('Due date is required to mark this line as due');
      return;
    }
    try {
      await markDue.mutateAsync({
        id: scheduleId,
        input: {
          lineId: line.id,
          dueDate: trimmed || undefined,
        },
      });
      success(`Line ${line.sequence} marked due`);
      handleClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'Mark due failed'));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Mark line due</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {line
            ? `Milestone: ${line.milestone} (seq ${line.sequence})`
            : ''}
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Due date"
          type="date"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={markDue.isPending}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={markDue.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={markDue.isPending || !scheduleId || !line}
        >
          Mark due
        </Button>
      </DialogActions>
    </Dialog>
  );
}
