import { useEffect, useMemo } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { RefundBreakdown } from './RefundBreakdown';
import type { BookingOption } from './types';
import { useRequestBookingCancellation } from './useBookingCancellations';
import {
  cancellationRequestSchema,
  type CancellationRequestFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  bookings: readonly BookingOption[];
};

/**
 * Request cancellation — Nest `POST /booking-cancellations` (`booking.cancel`).
 * Refund preview uses charge/deductions; Nest snapshots totalReceived on create.
 */
export function CancellationForm({ open, onClose, bookings }: Props) {
  const request = useRequestBookingCancellation();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } =
    useForm<CancellationRequestFormValues>({
      resolver: zodResolver(cancellationRequestSchema),
      defaultValues: {
        bookingId: '',
        cancellationReason: '',
        cancellationDate: new Date().toISOString().slice(0, 10),
        cancellationCharge: 0,
        deductions: 0,
        remarks: '',
        totalReceivedPreview: 0,
      },
    });

  const charge = useWatch({ control, name: 'cancellationCharge' }) ?? 0;
  const deductions = useWatch({ control, name: 'deductions' }) ?? 0;
  const totalPreview =
    useWatch({ control, name: 'totalReceivedPreview' }) ?? 0;

  const bookingOptions = useMemo(
    () =>
      bookings.map((b) => ({
        value: b.id,
        label: `${b.bookingNumber} · ${b.status}`,
      })),
    [bookings],
  );

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = async (values: CancellationRequestFormValues) => {
    try {
      await request.mutateAsync({
        bookingId: values.bookingId,
        cancellationReason: values.cancellationReason.trim(),
        cancellationDate: values.cancellationDate,
        cancellationCharge: values.cancellationCharge,
        deductions: values.deductions,
        remarks: values.remarks.trim() || null,
      });
      success('Cancellation requested');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 440 } } },
      }}
    >
      <Box sx={{ p: 3 }} data-testid="cancellation-form">
        <Stack
          spacing={2}
          component="form"
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
        >
          <Typography variant="h6">Request cancellation</Typography>
          <Typography variant="body2" color="text.secondary">
            Unit availability is not restored until the cancellation is
            approved and (when a refund is due) refunded, then released.
          </Typography>

          <FormSelect
            name="bookingId"
            control={control}
            label="Booking"
            options={bookingOptions}
          />
          <FormTextField
            name="cancellationDate"
            control={control}
            label="Cancellation date"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormTextField
            name="cancellationReason"
            control={control}
            label="Reason"
            multiline
            minRows={3}
            required
          />
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

          <RefundBreakdown
            totalReceived={Number(totalPreview) || 0}
            cancellationCharge={Number(charge) || 0}
            deductions={Number(deductions) || 0}
            dense
          />
          <Typography variant="caption" color="text.secondary">
            Total received is snapshotted from posted customer receipts when
            Nest creates the request. Preview above uses 0 until then.
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'flex-end' }}
          >
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={request.isPending || bookingOptions.length === 0}
            >
              Submit request
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
