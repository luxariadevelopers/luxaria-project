import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { DirectorForm } from './DirectorForm';
import { useCreateDirector } from './useDirectors';
import type { DirectorFormValues } from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
};

export function CreateDirectorDialog({ open, onClose, onCreated }: Props) {
  const create = useCreateDirector();
  const { success, error: notifyError } = useNotify();

  const handleSubmit = async (values: DirectorFormValues) => {
    try {
      const created = await create.mutateAsync({
        fullName: values.fullName,
        din: values.din ?? null,
        pan: values.pan ?? null,
        email: values.email ?? null,
        phone: values.phone ?? null,
        address: values.address ?? null,
        appointmentDate: values.appointmentDate ?? null,
        status: values.status,
      });
      success('Director created');
      onCreated(created.id);
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New director</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          DIN and PAN are validated when provided (8-digit DIN, Indian PAN).
        </Typography>
        <DirectorForm
          submitting={create.isPending}
          submitLabel="Create"
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
