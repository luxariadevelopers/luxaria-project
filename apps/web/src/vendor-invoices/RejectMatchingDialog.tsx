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
  rejectMatchingSchema,
  type RejectMatchingFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  onConfirm: (reason: string) => void;
};

export function RejectMatchingDialog({
  open,
  onClose,
  loading,
  onConfirm,
}: Props) {
  const { control, handleSubmit, reset } = useForm<RejectMatchingFormValues>({
    resolver: zodResolver(rejectMatchingSchema),
    defaultValues: { reason: '' },
  });

  const submit = handleSubmit((values) => {
    onConfirm(values.reason.trim());
    reset();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject three-way match</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="reject-matching-form"
          spacing={2}
          sx={{ mt: 1 }}
          onSubmit={submit}
        >
          <Typography variant="body2" color="text.secondary">
            Nest `POST …/reject-matching` (vendor_invoice.match). Re-run match
            after correcting the invoice or GRNs.
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
          form="reject-matching-form"
          variant="contained"
          color="error"
          disabled={loading}
        >
          Reject matching
        </Button>
      </DialogActions>
    </Dialog>
  );
}
