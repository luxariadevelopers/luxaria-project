import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/client';
import { useNotify } from '@/components/NotificationProvider';
import { fetchBooking } from '@/bookings/api';
import { scheduleTypeLabel } from './labels';
import {
  linesFromBookingInstallments,
  ScheduleLineEditor,
} from './ScheduleLineEditor';
import {
  PaymentScheduleType,
  type BookingOption,
  type PaymentScheduleLineInput,
  type PaymentScheduleTypeValue,
} from './types';
import { useGeneratePaymentSchedule } from './usePaymentSchedules';

type Props = {
  open: boolean;
  onClose: () => void;
  bookings: readonly BookingOption[];
  canViewBookings: boolean;
  onCreated?: (scheduleId: string) => void;
};

const TYPE_OPTIONS = Object.values(PaymentScheduleType).map((value) => ({
  value,
  label: scheduleTypeLabel(value),
}));

const TYPES_REQUIRING_EXPLICIT_LINES = new Set<string>([
  PaymentScheduleType.ConstructionMilestone,
  PaymentScheduleType.BankDisbursement,
]);

export function GeneratePaymentScheduleForm({
  open,
  onClose,
  bookings,
  canViewBookings,
  onCreated,
}: Props) {
  const generate = useGeneratePaymentSchedule();
  const { success, error: notifyError } = useNotify();

  const [bookingId, setBookingId] = useState('');
  const [scheduleType, setScheduleType] = useState<PaymentScheduleTypeValue>(
    PaymentScheduleType.DateBased,
  );
  const [remarks, setRemarks] = useState('');
  const [submit, setSubmit] = useState(false);
  const [lines, setLines] = useState<PaymentScheduleLineInput[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const selectedBooking = useMemo(
    () => bookings.find((b) => b.id === bookingId),
    [bookings, bookingId],
  );

  const requiresExplicitLines = TYPES_REQUIRING_EXPLICIT_LINES.has(scheduleType);
  const showLineEditor =
    requiresExplicitLines ||
    scheduleType === PaymentScheduleType.Custom ||
    lines.length > 0;

  useEffect(() => {
    if (!open) return;
    setBookingId('');
    setScheduleType(PaymentScheduleType.DateBased);
    setRemarks('');
    setSubmit(false);
    setLines([]);
  }, [open]);

  useEffect(() => {
    if (!bookingId || !open) return;
    let cancelled = false;
    setLoadingPlan(true);
    void fetchBooking(bookingId)
      .then((booking) => {
        if (cancelled) return;
        const installments = booking.paymentPlan?.installments ?? [];
        if (installments.length) {
          setLines(linesFromBookingInstallments(installments));
        } else {
          setLines([
            {
              sequence: 1,
              milestone: '',
              dueDate: null,
              percentage: 100,
              amount: booking.approvedPrice,
              tax: 0,
            },
          ]);
        }
      })
      .catch(() => {
        if (!cancelled) setLines([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPlan(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, open]);

  const handleSubmit = async () => {
    if (!bookingId) {
      notifyError('Select a booking');
      return;
    }
    try {
      const payload = {
        bookingId,
        scheduleType,
        remarks: remarks.trim() || null,
        submit,
        ...(showLineEditor && lines.length ? { lines } : {}),
      };
      const created = await generate.mutateAsync(payload);
      success(
        submit
          ? `Schedule ${created.scheduleNumber} submitted for approval`
          : `Schedule ${created.scheduleNumber} generated`,
      );
      onCreated?.(created.id);
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'Generate schedule failed'));
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 640 } } },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Generate payment schedule</Typography>
          <Typography variant="body2" color="text.secondary">
            Creates a draft from an eligible booking (booked / agreement /
            registered). Nest validates line totals against approved price.
          </Typography>

          {!canViewBookings ? (
            <Alert severity="warning">
              Booking picker requires `booking.view`. Enter booking id manually
              is not supported here.
            </Alert>
          ) : null}

          <FormControl fullWidth size="small">
            <InputLabel id="generate-booking-label">Booking</InputLabel>
            <Select
              labelId="generate-booking-label"
              label="Booking"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              disabled={!canViewBookings || generate.isPending}
            >
              {bookings.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedBooking ? (
            <Typography variant="body2" color="text.secondary">
              Approved price: ₹{selectedBooking.approvedPrice.toLocaleString('en-IN')}
            </Typography>
          ) : null}

          <FormControl fullWidth size="small">
            <InputLabel id="generate-type-label">Schedule type</InputLabel>
            <Select
              labelId="generate-type-label"
              label="Schedule type"
              value={scheduleType}
              onChange={(e) =>
                setScheduleType(e.target.value as PaymentScheduleTypeValue)
              }
              disabled={generate.isPending}
            >
              {TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Remarks"
            size="small"
            multiline
            minRows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={generate.isPending}
          />

          {requiresExplicitLines ? (
            <Alert severity="info">
              {scheduleTypeLabel(scheduleType)} schedules require explicit
              installment lines.
            </Alert>
          ) : null}

          {showLineEditor ? (
            <ScheduleLineEditor
              lines={lines}
              onChange={setLines}
              requireDueDate={scheduleType === PaymentScheduleType.DateBased}
              disabled={generate.isPending || loadingPlan}
            />
          ) : (
            <Alert severity="info">
              Lines will be seeded from the booking payment plan when omitted
              (date_based / custom).
            </Alert>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={submit}
                onChange={(e) => setSubmit(e.target.checked)}
                disabled={generate.isPending}
              />
            }
            label="Submit for approval immediately"
          />

          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'flex-end' }}
          >
            <Button onClick={onClose} disabled={generate.isPending}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleSubmit()}
              disabled={generate.isPending || !bookingId}
            >
              {submit ? 'Generate & submit' : 'Generate draft'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
