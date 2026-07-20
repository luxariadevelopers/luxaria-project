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
import {
  rejectMeasurementSchema,
  type RejectMeasurementFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  onConfirm: (reason: string) => void;
};

export function RejectMeasurementDialog({
  open,
  onClose,
  loading,
  onConfirm,
}: Props) {
  const { control, handleSubmit, reset } = useForm<RejectMeasurementFormValues>(
    {
      resolver: zodResolver(rejectMeasurementSchema),
      defaultValues: { reason: '' },
    },
  );

  const submit = handleSubmit((values) => {
    onConfirm(values.reason.trim());
    reset();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject work measurement</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="reject-measurement-form"
          spacing={2}
          sx={{ mt: 1 }}
          onSubmit={submit}
        >
          <Typography variant="body2" color="text.secondary">
            Nest `POST …/reject` (`measurement.certify`). Edit and resubmit
            after rejection.
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
          form="reject-measurement-form"
          variant="contained"
          color="error"
          disabled={loading}
        >
          Reject measurement
        </Button>
      </DialogActions>
    </Dialog>
  );
}
