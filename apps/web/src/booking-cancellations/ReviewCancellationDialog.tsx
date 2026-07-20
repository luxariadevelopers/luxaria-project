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
import { useForm, useWatch } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { RefundBreakdown } from './RefundBreakdown';
import type { PublicBookingCancellation } from './types';
import { useReviewBookingCancellation } from './useBookingCancellations';
import {
  cancellationReviewSchema,
  type CancellationReviewFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  row: PublicBookingCancellation | null;
};

export function ReviewCancellationDialog({ open, onClose, row }: Props) {
  const review = useReviewBookingCancellation();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } =
    useForm<CancellationReviewFormValues>({
      resolver: zodResolver(cancellationReviewSchema),
      defaultValues: {
        cancellationCharge: 0,
        deductions: 0,
        remarks: '',
        totalReceived: 0,
      },
    });

  const charge = useWatch({ control, name: 'cancellationCharge' }) ?? 0;
  const deductions = useWatch({ control, name: 'deductions' }) ?? 0;

  useEffect(() => {
    if (open && row) {
      reset({
        cancellationCharge: row.cancellationCharge,
        deductions: row.deductions,
        remarks: row.remarks ?? '',
        totalReceived: row.totalReceived,
      });
    }
  }, [open, row, reset]);

  const onSubmit = async (values: CancellationReviewFormValues) => {
    if (!row) return;
    try {
      await review.mutateAsync({
        id: row.id,
        input: {
          cancellationCharge: values.cancellationCharge,
          deductions: values.deductions,
          remarks: values.remarks.trim() || null,
        },
      });
      success('Cancellation reviewed');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
      >
        <DialogTitle>Review cancellation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormTextField
              name="cancellationCharge"
              control={control}
              label="Cancellation charge"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />
            <FormTextField
              name="deductions"
              control={control}
              label="Deductions"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />
            <FormTextField
              name="remarks"
              control={control}
              label="Remarks"
              multiline
              minRows={2}
            />
            {row ? (
              <RefundBreakdown
                totalReceived={row.totalReceived}
                cancellationCharge={Number(charge) || 0}
                deductions={Number(deductions) || 0}
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button type="submit" variant="contained" disabled={review.isPending}>
            Mark reviewed
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
