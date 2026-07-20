import { useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { materialUnitLabel } from './labels';
import type { PublicMaterialIssue } from './types';
import { useCreateMaterialReturn } from './useMaterialIssues';
import {
  materialReturnSchema,
  type MaterialReturnFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  issue: PublicMaterialIssue | null;
  onReturned?: () => void;
};

/**
 * Post return from work (`POST /material-issues/:id/returns`, `stock.issue`).
 * Quantity must be positive and ≤ remaining issued base qty.
 */
export function ReturnForm({ open, onClose, issue, onReturned }: Props) {
  const createReturn = useCreateMaterialReturn();
  const { success, error: notifyError } = useNotify();

  const returnable = useMemo(
    () =>
      (issue?.items ?? []).filter((item) => item.remainingBaseQuantity > 1e-9),
    [issue],
  );

  const { control, handleSubmit, reset } = useForm<MaterialReturnFormValues>({
    resolver: zodResolver(materialReturnSchema),
    defaultValues: {
      returnDate: new Date().toISOString().slice(0, 10),
      notes: '',
      items: [],
    },
  });

  const { fields } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (!open || !issue) return;
    reset({
      returnDate: new Date().toISOString().slice(0, 10),
      notes: '',
      items: returnable.map((item) => ({
        materialId: item.materialId,
        quantity: Math.min(item.remainingBaseQuantity, item.quantity),
        unit: item.baseUnit,
        reason: '',
        remainingBaseQuantity: item.remainingBaseQuantity,
        materialLabel: item.materialCode ?? item.materialId,
      })),
    });
  }, [open, issue, reset, returnable]);

  const onSubmit = async (values: MaterialReturnFormValues) => {
    if (!issue) return;
    try {
      await createReturn.mutateAsync({
        id: issue.id,
        input: {
          returnDate: values.returnDate,
          notes: values.notes?.trim() || null,
          items: values.items.map((item) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            unit: item.unit,
            reason: item.reason?.trim() || null,
          })),
        },
      });
      success('Material return posted');
      onClose();
      onReturned?.();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="return-form"
    >
      <DialogTitle>Return from work</DialogTitle>
      <DialogContent>
        <Box component="form" id="return-form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Return quantities must be positive and cannot exceed remaining
              issued stock.
            </Typography>
            <FormTextField
              name="returnDate"
              control={control}
              label="Return date"
              type="date"
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {fields.map((field, index) => {
              const item = returnable[index];
              return (
                <Stack
                  key={field.id}
                  spacing={1}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1.5,
                  }}
                >
                  <Typography variant="subtitle2">
                    {item?.materialCode ?? field.materialId} · remaining{' '}
                    {item?.remainingBaseQuantity ?? '—'}{' '}
                    {item ? materialUnitLabel(item.baseUnit) : ''}
                  </Typography>
                  <FormTextField
                    name={`items.${index}.quantity`}
                    control={control}
                    label="Return quantity"
                    type="number"
                    required
                  />
                  <FormTextField
                    name={`items.${index}.reason`}
                    control={control}
                    label="Reason"
                  />
                </Stack>
              );
            })}
            <FormTextField
              name="notes"
              control={control}
              label="Notes"
              multiline
              minRows={2}
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={createReturn.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="return-form"
          variant="contained"
          disabled={createReturn.isPending || fields.length === 0}
        >
          {createReturn.isPending ? 'Posting…' : 'Post return'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
