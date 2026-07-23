import { useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import {
  getErrorMessage,
  isConflictError,
} from '@/api/client';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { BankSourceFields } from './BankSourceFields';
import {
  DemandAllocationPanel,
  type AllocationLineState,
} from './DemandAllocationPanel';
import { paymentModeLabel, sourceTypeLabel } from './labels';
import {
  CustomerReceiptPaymentMode,
  CustomerReceiptSourceType,
  type BankAccountOption,
  type BookingOption,
} from './types';
import {
  useAllocatableDemands,
  useCreateCustomerReceipt,
} from './useCustomerReceipts';
import { formDrawerPaperSx } from '@/components/forms';
import {
  customerReceiptCreateSchema,
  isDuplicateTransactionReferenceMessage,
  type CustomerReceiptCreateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  bookings: readonly BookingOption[];
  bankAccounts: readonly BankAccountOption[];
  canViewBookings: boolean;
  canViewBankAccounts: boolean;
  canPost: boolean;
  banksLoading?: boolean;
};

const MODE_OPTIONS = Object.values(CustomerReceiptPaymentMode).map(
  (value) => ({
    value,
    label: paymentModeLabel(value),
  }),
);

const SOURCE_OPTIONS = Object.values(CustomerReceiptSourceType).map(
  (value) => ({
    value,
    label: sourceTypeLabel(value),
  }),
);

export function ReceiptForm({
  open,
  onClose,
  bookings,
  bankAccounts,
  canViewBookings,
  canViewBankAccounts,
  canPost,
  banksLoading,
}: Props) {
  const create = useCreateCustomerReceipt();
  const { success, error: notifyError, warning } = useNotify();

  const { control, handleSubmit, reset, setValue } =
    useForm<CustomerReceiptCreateFormValues>({
      resolver: zodResolver(
        customerReceiptCreateSchema,
      ) as Resolver<CustomerReceiptCreateFormValues>,
      defaultValues: {
        customerId: '',
        bookingId: '',
        receiptDate: new Date().toISOString().slice(0, 10),
        amount: 0.01,
        paymentMode: CustomerReceiptPaymentMode.BankTransfer,
        companyBankAccountId: '',
        transactionReference: '',
        sourceType: CustomerReceiptSourceType.OwnFund,
        loanBank: '',
        scheduleAllocation: [],
        receiptDocument: '',
        remarks: '',
        postImmediately: false,
      },
    });

  const bookingId = useWatch({ control, name: 'bookingId' });
  const paymentMode = useWatch({ control, name: 'paymentMode' });
  const sourceType = useWatch({ control, name: 'sourceType' });
  const amount = useWatch({ control, name: 'amount' });
  const postImmediately = useWatch({ control, name: 'postImmediately' });
  const scheduleAllocation =
    useWatch({ control, name: 'scheduleAllocation' }) ?? [];

  const demands = useAllocatableDemands(bookingId || null, open);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (!bookingId) return;
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      setValue('customerId', booking.customerId);
    }
  }, [bookingId, bookings, setValue]);

  const bookingOptions = useMemo(
    () =>
      bookings.map((b) => ({
        value: b.id,
        label: b.label,
      })),
    [bookings],
  );

  const onSubmit = handleSubmit(async (values) => {
    const allocations = (values.scheduleAllocation ?? []).filter(
      (line) => line.amount > 0,
    );
    try {
      const row = await create.mutateAsync({
        customerId: values.customerId,
        bookingId: values.bookingId,
        receiptDate: values.receiptDate,
        amount: values.amount,
        paymentMode: values.paymentMode,
        companyBankAccountId: values.companyBankAccountId || null,
        transactionReference: values.transactionReference || null,
        sourceType: values.sourceType,
        loanBank: values.loanBank || null,
        scheduleAllocation: allocations,
        receiptDocument: values.receiptDocument || null,
        remarks: values.remarks || null,
        post: Boolean(values.postImmediately && canPost),
      });
      success(
        row.status === 'posted'
          ? `Collection ${row.receiptNumber} posted; PDF generated`
          : `Draft receipt ${row.receiptNumber} created`,
      );
      onClose();
    } catch (err) {
      const message = getErrorMessage(err, 'Create receipt failed');
      if (
        isConflictError(err) ||
        isDuplicateTransactionReferenceMessage(message)
      ) {
        warning(
          'Duplicate transaction reference for this bank account. Use a unique UTR / cheque number.',
        );
        return;
      }
      notifyError(message);
    }
  });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: formDrawerPaperSx(480) },
      }}
    >
      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{ p: 3, display: 3, height: '100%', overflow: 'auto' }}
        data-testid="receipt-form"
      >
        <Typography variant="h6">Record collection</Typography>
        <Typography variant="body2" color="text.secondary">
          Create a customer receipt, allocate demands, then post to generate
          the PDF.
        </Typography>

        {canViewBookings ? (
          <FormSelect
            name="bookingId"
            control={control}
            label="Booking"
            options={bookingOptions}
          />
        ) : (
          <FormTextField
            name="bookingId"
            control={control}
            label="Booking id"
            helperText="Requires booking.view to pick from a list."
          />
        )}

        <FormTextField
          name="customerId"
          control={control}
          label="Customer id"
          helperText="Auto-filled from booking when available."
        />

        <FormTextField
          name="receiptDate"
          control={control}
          label="Receipt date"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <FormTextField
          name="amount"
          control={control}
          label="Amount"
          type="number"
          slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }}
        />

        <FormSelect
          name="paymentMode"
          control={control}
          label="Payment mode"
          options={MODE_OPTIONS}
        />

        <FormSelect
          name="sourceType"
          control={control}
          label="Source"
          options={SOURCE_OPTIONS}
        />

        {sourceType === CustomerReceiptSourceType.BankLoan ? (
          <FormTextField
            name="loanBank"
            control={control}
            label="Loan bank"
          />
        ) : null}

        <BankSourceFields
          control={control}
          paymentMode={paymentMode}
          bankAccounts={bankAccounts}
          canViewBankAccounts={canViewBankAccounts}
          banksLoading={banksLoading}
        />

        <DemandAllocationPanel
          receiptAmount={Number(amount) || 0}
          demands={demands.data ?? []}
          loading={demands.isLoading}
          error={demands.error}
          onRetry={() => void demands.refetch()}
          value={scheduleAllocation as AllocationLineState[]}
          onChange={(next) => setValue('scheduleAllocation', next)}
        />

        <FormTextField
          name="receiptDocument"
          control={control}
          label="Proof path (optional)"
          helperText="Relative path / document key stored as receiptDocument."
        />

        <FormTextField
          name="remarks"
          control={control}
          label="Remarks"
          multiline
          minRows={2}
        />

        {canPost ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(postImmediately)}
                onChange={(_, checked) =>
                  setValue('postImmediately', checked)
                }
              />
            }
            label="Post immediately (allocates demands + generates PDF)"
          />
        ) : (
          <Alert severity="info" variant="outlined">
            Posting requires `collection.approve`. Save as draft, then ask an
            approver to post.
          </Alert>
        )}

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={create.isPending}
          >
            {create.isPending ? 'Saving…' : 'Save receipt'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
