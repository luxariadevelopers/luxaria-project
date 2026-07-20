import { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormTextField } from '@/components/forms';
import { formatCoefficientVersionLabel } from './labels';
import type { PublicMaterialCoefficient } from './types';
import {
  rejectCoefficientSchema,
  type RejectCoefficientFormValues,
} from './validation';

type Props = {
  open: boolean;
  row: PublicMaterialCoefficient | null;
  onClose: () => void;
  onSubmit: (values: RejectCoefficientFormValues) => Promise<void>;
  submitting?: boolean;
};

export function RejectCoefficientDialog({
  open,
  row,
  onClose,
  onSubmit,
  submitting = false,
}: Props) {
  const { control, handleSubmit, reset } = useForm<RejectCoefficientFormValues>({
    resolver: zodResolver(rejectCoefficientSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (!open) reset({ reason: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject consumption standard</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
          component="form"
          id="reject-coefficient-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          {row && (
            <Typography variant="body2" color="text.secondary">
              Rejecting {formatCoefficientVersionLabel(row)} returns it to draft
              for editing after rejection is recorded.
            </Typography>
          )}
          <FormTextField
            name="reason"
            control={control}
            label="Rejection reason"
            multiline
            minRows={2}
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="reject-coefficient-form"
          color="error"
          variant="contained"
          disabled={submitting}
        >
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
}
