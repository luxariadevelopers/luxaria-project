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
  approveCoefficientSchema,
  type ApproveCoefficientFormValues,
} from './validation';

type Props = {
  open: boolean;
  row: PublicMaterialCoefficient | null;
  onClose: () => void;
  onSubmit: (values: ApproveCoefficientFormValues) => Promise<void>;
  submitting?: boolean;
};

export function ApproveCoefficientDialog({
  open,
  row,
  onClose,
  onSubmit,
  submitting = false,
}: Props) {
  const { control, handleSubmit, reset } = useForm<ApproveCoefficientFormValues>({
    resolver: zodResolver(approveCoefficientSchema),
    defaultValues: { approvalReference: '', notes: '' },
  });

  useEffect(() => {
    if (!open) reset({ approvalReference: '', notes: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Approve consumption standard</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
          component="form"
          id="approve-coefficient-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          {row && (
            <Typography variant="body2" color="text.secondary">
              Approving {formatCoefficientVersionLabel(row)} activates it and
              supersedes any prior active version for the same scope.
            </Typography>
          )}
          <FormTextField
            name="approvalReference"
            control={control}
            label="Approval reference"
            required
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
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="approve-coefficient-form"
          variant="contained"
          disabled={submitting}
        >
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
