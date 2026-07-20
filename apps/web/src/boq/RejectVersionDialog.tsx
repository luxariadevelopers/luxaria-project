import { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormTextField } from '@/components/forms';
import {
  rejectBoqVersionSchema,
  type RejectBoqVersionFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: RejectBoqVersionFormValues) => Promise<void>;
  submitting?: boolean;
};

export function RejectVersionDialog({
  open,
  onClose,
  onSubmit,
  submitting = false,
}: Props) {
  const { control, handleSubmit, reset } =
    useForm<RejectBoqVersionFormValues>({
      resolver: zodResolver(rejectBoqVersionSchema),
      defaultValues: { reason: '' },
    });

  useEffect(() => {
    if (!open) reset({ reason: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject BOQ version</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
          component="form"
          id="reject-boq-version-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormTextField
            name="reason"
            control={control}
            label="Rejection reason"
            required
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="reject-boq-version-form"
          variant="contained"
          color="error"
          disabled={submitting}
        >
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
}
