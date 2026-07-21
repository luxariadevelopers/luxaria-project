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
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { LEAD_STATUS_OPTIONS } from './labels';
import { useTransitionLead } from './useLeads';
import { LeadStatus, type LeadListRow, type LeadStatus as LeadStatusType } from './types';

type Props = {
  open: boolean;
  lead: LeadListRow | null;
  onClose: () => void;
};

export function TransitionLeadDialog({ open, lead, onClose }: Props) {
  const { success, error: notifyError } = useNotify();
  const transition = useTransitionLead(lead?.id);
  const [status, setStatus] = useState<LeadStatusType>(LeadStatus.Contacted);
  const [lostReason, setLostReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open && lead) {
      setStatus(LeadStatus.Contacted);
      setLostReason('');
      setNote('');
    }
  }, [open, lead]);

  const handleSubmit = async () => {
    if (!lead) return;
    if (status === LeadStatus.Lost && !lostReason.trim()) {
      notifyError('Lost reason is required');
      return;
    }
    try {
      await transition.mutateAsync({
        id: lead.id,
        input: {
          status,
          lostReason: status === LeadStatus.Lost ? lostReason.trim() : null,
          note: note.trim() || null,
        },
      });
      success('Lead status updated');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'Transition failed'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Transition lead {lead?.leadNumber ?? ''}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="lead-transition-status">Status</InputLabel>
            <Select
              labelId="lead-transition-status"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatusType)}
            >
              {LEAD_STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {status === LeadStatus.Lost ? (
            <TextField
              label="Lost reason"
              required
              multiline
              minRows={2}
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            />
          ) : null}
          <TextField
            label="Note (optional)"
            multiline
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={transition.isPending}
        >
          Update status
        </Button>
      </DialogActions>
    </Dialog>
  );
}
