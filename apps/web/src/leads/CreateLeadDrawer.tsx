import { useState } from 'react';
import {
  Button,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { LEAD_SOURCE_OPTIONS } from './labels';
import { useCreateLead } from './useLeads';
import { LeadSource, type CreateLeadInput } from './types';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId?: string | null;
};

const emptyForm = (): CreateLeadInput => ({
  source: LeadSource.WalkIn,
  contact: { fullName: '', phone: null, email: null },
  projectId: null,
  notes: null,
});

export function CreateLeadDrawer({ open, onClose, projectId }: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateLead();
  const [form, setForm] = useState<CreateLeadInput>(emptyForm);

  const handleClose = () => {
    setForm(emptyForm());
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.contact.fullName.trim()) {
      notifyError('Contact name is required');
      return;
    }
    try {
      await create.mutateAsync({
        ...form,
        projectId: projectId ?? form.projectId ?? null,
        contact: {
          ...form.contact,
          fullName: form.contact.fullName.trim(),
          phone: form.contact.phone?.trim() || null,
          email: form.contact.email?.trim() || null,
        },
      });
      success('Lead created');
      handleClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'Could not create lead'));
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={handleClose}>
      <Stack spacing={2} sx={{ width: { xs: '100vw', sm: 420 }, p: 3 }}>
        <Typography variant="h6">New lead</Typography>
        <TextField
          label="Full name"
          required
          value={form.contact.fullName}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              contact: { ...prev.contact, fullName: e.target.value },
            }))
          }
        />
        <TextField
          label="Phone"
          value={form.contact.phone ?? ''}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              contact: { ...prev.contact, phone: e.target.value },
            }))
          }
        />
        <TextField
          label="Email"
          value={form.contact.email ?? ''}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              contact: { ...prev.contact, email: e.target.value },
            }))
          }
        />
        <FormControl>
          <InputLabel id="lead-create-source">Source</InputLabel>
          <Select
            labelId="lead-create-source"
            label="Source"
            value={form.source}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                source: e.target.value as CreateLeadInput['source'],
              }))
            }
          >
            {LEAD_SOURCE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Notes"
          multiline
          minRows={3}
          value={form.notes ?? ''}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, notes: e.target.value || null }))
          }
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={create.isPending}
          >
            Create
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
