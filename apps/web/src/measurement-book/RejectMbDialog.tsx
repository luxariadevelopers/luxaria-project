import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { FormTextField } from '@/components/forms/FormTextField';
import { rejectMbSchema, type RejectMbFormValues } from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  onConfirm: (reason: string) => void;
};

export function RejectMbDialog({
  open,
  onClose,
  loading,
  onConfirm,
}: Props) {
  const { control, handleSubmit, reset } = useForm<RejectMbFormValues>({
    resolver: zodResolver(rejectMbSchema),
    defaultValues: { reason: '' },
  });

  const submit = handleSubmit((values) => {
    onConfirm(values.reason.trim());
    reset();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject measurement book entry</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="reject-mb-form"
          spacing={2}
          sx={{ mt: 1 }}
          onSubmit={submit}
        >
          <Typography variant="body2" color="text.secondary">
            Nest `POST /measurement-book/:id/reject` (`measurement.certify`).
          </Typography>
          <FormTextField
            name="reason"
            control={control}
            label="Rejection reason"
            multiline
            minRows={3}
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="reject-mb-form"
          variant="contained"
          color="error"
          disabled={loading}
        >
          Reject entry
        </Button>
      </DialogActions>
    </Dialog>
  );
}
