import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/client';
import { useNotify } from '@/components/NotificationProvider';
import { scheduleTypeLabel } from './labels';
import { ScheduleLineEditor } from './ScheduleLineEditor';
import {
  PaymentScheduleType,
  type PaymentScheduleLineInput,
  type PaymentScheduleTypeValue,
  type PublicPaymentSchedule,
} from './types';
import { useRevisePaymentSchedule } from './usePaymentSchedules';

type Props = {
  open: boolean;
  onClose: () => void;
  schedule: PublicPaymentSchedule | null;
  onRevised?: (scheduleId: string) => void;
};

const TYPE_OPTIONS = Object.values(PaymentScheduleType).map((value) => ({
  value,
  label: scheduleTypeLabel(value),
}));

function toLineInputs(
  schedule: PublicPaymentSchedule,
): PaymentScheduleLineInput[] {
  return schedule.lines.map((line) => ({
    sequence: line.sequence,
    milestone: line.milestone,
    dueDate: line.dueDate?.slice(0, 10) ?? null,
    percentage: line.percentage,
    amount: line.amount,
    tax: line.tax,
  }));
}

export function RevisePaymentScheduleDialog({
  open,
  onClose,
  schedule,
  onRevised,
}: Props) {
  const revise = useRevisePaymentSchedule();
  const { success, error: notifyError } = useNotify();
  const [scheduleType, setScheduleType] = useState<PaymentScheduleTypeValue>(
    PaymentScheduleType.DateBased,
  );
  const [remarks, setRemarks] = useState('');
  const [submit, setSubmit] = useState(true);
  const [lines, setLines] = useState<PaymentScheduleLineInput[]>([]);

  useEffect(() => {
    if (!schedule || !open) return;
    setScheduleType(schedule.scheduleType as PaymentScheduleTypeValue);
    setRemarks(schedule.remarks ?? '');
    setSubmit(true);
    setLines(toLineInputs(schedule));
  }, [schedule, open]);

  const handleSubmit = async () => {
    if (!schedule) return;
    try {
      const updated = await revise.mutateAsync({
        id: schedule.id,
        input: {
          scheduleType,
          lines,
          remarks: remarks.trim() || null,
          submit,
        },
      });
      success(
        submit
          ? `Revision ${updated.scheduleNumber} submitted for approval`
          : `Revision ${updated.scheduleNumber} saved as draft`,
      );
      onRevised?.(updated.id);
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'Revise schedule failed'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Revise payment schedule</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Creates a new revision; the active schedule stays in effect until
            the revision is approved.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="revise-type-label">Schedule type</InputLabel>
            <Select
              labelId="revise-type-label"
              label="Schedule type"
              value={scheduleType}
              onChange={(e) =>
                setScheduleType(e.target.value as PaymentScheduleTypeValue)
              }
              disabled={revise.isPending}
            >
              {TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Remarks"
            size="small"
            multiline
            minRows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={revise.isPending}
          />
          <ScheduleLineEditor
            lines={lines}
            onChange={setLines}
            requireDueDate={scheduleType === PaymentScheduleType.DateBased}
            disabled={revise.isPending}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={revise.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={revise.isPending || !schedule}
        >
          {submit ? 'Save & submit' : 'Save draft revision'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
