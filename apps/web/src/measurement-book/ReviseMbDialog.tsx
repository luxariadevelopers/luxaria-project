import { useEffect } from 'react';
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
import type { PublicMeasurementBookEntry, ReviseMeasurementBookInput } from './api';
import {
  formValuesToReviseInput,
  reviseMbSchema,
  type ReviseMbFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  entry: PublicMeasurementBookEntry | null;
  loading?: boolean;
  onConfirm: (input: ReviseMeasurementBookInput) => void;
};

/**
 * Nest `POST /measurement-book/:id/revise` — creates a revision draft from a
 * certified entry (`measurement.create`). Certified qty is never silently edited.
 */
export function ReviseMbDialog({
  open,
  onClose,
  entry,
  loading,
  onConfirm,
}: Props) {
  const { control, handleSubmit, reset } = useForm<ReviseMbFormValues>({
    resolver: zodResolver(reviseMbSchema),
    defaultValues: {
      reason: '',
      length: null,
      breadth: null,
      height: null,
      numberOfUnits: 1,
      quantity: null,
      workDescription: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open || !entry) return;
    reset({
      reason: '',
      length: entry.length,
      breadth: entry.breadth,
      height: entry.height,
      numberOfUnits: entry.numberOfUnits,
      quantity: entry.quantity,
      workDescription: entry.workDescription ?? '',
      notes: entry.notes ?? '',
    });
  }, [open, entry, reset]);

  const submit = handleSubmit((values) => {
    onConfirm(formValuesToReviseInput(values));
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Revise entry{entry ? ` — ${entry.entryNumber}` : ''}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="revise-mb-form"
          spacing={2}
          sx={{ mt: 1 }}
          onSubmit={submit}
        >
          <Typography variant="body2" color="text.secondary">
            Nest `POST /measurement-book/:id/revise` (`measurement.create`).
            Opens a new draft revision; certified quantities stay immutable.
          </Typography>
          <FormTextField
            name="reason"
            control={control}
            label="Revision reason"
            multiline
            minRows={2}
            required
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField
              name="length"
              control={control}
              label="Length (L)"
              type="number"
            />
            <FormTextField
              name="breadth"
              control={control}
              label="Breadth (B)"
              type="number"
            />
            <FormTextField
              name="height"
              control={control}
              label="Height (H)"
              type="number"
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField
              name="numberOfUnits"
              control={control}
              label="Number of units"
              type="number"
            />
            <FormTextField
              name="quantity"
              control={control}
              label="Quantity (override)"
              type="number"
            />
          </Stack>
          <FormTextField
            name="workDescription"
            control={control}
            label="Work description"
            multiline
            minRows={2}
          />
          <FormTextField
            name="notes"
            control={control}
            label="Notes"
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="revise-mb-form"
          variant="contained"
          disabled={loading}
        >
          Create revision draft
        </Button>
      </DialogActions>
    </Dialog>
  );
}
