import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { DateInput } from '@/components/forms/DateInput';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { BillAllocationEditor } from './BillAllocationEditor';
import { paymentModeLabel } from './labels';
import {
  ContractorPaymentMode,
  type PublicContractorPayment,
} from './types';
import {
  useBankAccountOptions,
  useCreateContractorPayment,
  useContractorOptions,
  usePayableBills,
  useUpdateContractorPayment,
} from './useContractorPayments';
import {
  computeBankAmount,
  filterPayableBills,
  paymentFormSchema,
  toCreatePaymentInput,
  type PaymentFormValues,
} from './validation';

export type PaymentEntryMode = 'create' | 'edit' | 'view';

type Props = {
  open: boolean;
  onClose: () => void;
  mode: PaymentEntryMode;
  projectId: string;
  payment: PublicContractorPayment | null;
  canCreate: boolean;
  canViewBankAccounts: boolean;
  canViewContractors: boolean;
  canViewRunningBills: boolean;
  contractorLabel: (contractorId: string) => string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultValues(): PaymentFormValues {
  return {
    contractorId: '',
    paymentDate: todayIso(),
    amount: 0,
    paymentMode: ContractorPaymentMode.Neft,
    bankAccountId: '',
    transactionReference: '',
    tds: 0,
    retention: 0,
    advanceRecovery: 0,
    penalty: 0,
    paymentProof: '',
    notes: '',
    allocations: [],
  };
}

/**
 * PaymentForm — create / edit / view contractor payment with bill allocation,
 * retention / advance / TDS / penalty display, and proof reference.
 */
export function PaymentForm({
  open,
  onClose,
  mode,
  projectId,
  payment,
  canCreate,
  canViewBankAccounts,
  canViewContractors,
  canViewRunningBills,
  contractorLabel,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateContractorPayment();
  const update = useUpdateContractorPayment();

  const readOnly = mode === 'view' || !canCreate;
  const editable = mode === 'create' || mode === 'edit';

  const { control, handleSubmit, reset, setValue } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: defaultValues(),
    mode: 'onBlur',
  });

  const contractorId = useWatch({ control, name: 'contractorId' });
  const amount = useWatch({ control, name: 'amount' }) ?? 0;
  const tds = useWatch({ control, name: 'tds' }) ?? 0;
  const retention = useWatch({ control, name: 'retention' }) ?? 0;
  const advanceRecovery = useWatch({ control, name: 'advanceRecovery' }) ?? 0;
  const penalty = useWatch({ control, name: 'penalty' }) ?? 0;
  const allocations = useWatch({ control, name: 'allocations' }) ?? [];

  const contractors = useContractorOptions('', open && canViewContractors);
  const banks = useBankAccountOptions(
    projectId,
    open && canViewBankAccounts,
  );
  const payable = usePayableBills(
    projectId,
    contractorId || undefined,
    open && canViewRunningBills && Boolean(contractorId),
  );

  const payableRows = useMemo(
    () => filterPayableBills(payable.data ?? []),
    [payable.data],
  );

  useEffect(() => {
    if (!open) return;
    if (payment && (mode === 'edit' || mode === 'view')) {
      reset({
        contractorId: payment.contractorId,
        paymentDate: payment.paymentDate.slice(0, 10),
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        bankAccountId: payment.bankAccountId,
        transactionReference: payment.transactionReference,
        tds: payment.tds,
        retention: payment.retention,
        advanceRecovery: payment.advanceRecovery,
        penalty: payment.penalty,
        paymentProof: payment.paymentProof ?? '',
        notes: payment.notes ?? '',
        allocations: payment.allocations.map((a) => ({
          billId: a.billId,
          billLabel:
            [a.billNumber, a.raNumber != null ? `RA ${a.raNumber}` : null]
              .filter(Boolean)
              .join(' · ') || a.billId.slice(-6),
          remainingPayable: a.amount,
          billRetention: 0,
          billAdvanceRecovery: 0,
          billTds: 0,
          selected: true,
          amount: a.amount,
        })),
      });
      return;
    }
    reset(defaultValues());
  }, [open, payment, mode, reset]);

  useEffect(() => {
    if (!open || mode !== 'create' || !contractorId) return;
    setValue(
      'allocations',
      payableRows.map((bill) => ({
        billId: bill.id,
        billLabel: `${bill.billNumber} · RA ${bill.raNumber}`,
        remainingPayable: bill.remainingPayable,
        billRetention: bill.retention,
        billAdvanceRecovery: bill.advanceRecovery,
        billTds: bill.tds,
        selected: false,
        amount: 0,
      })),
    );
  }, [open, mode, contractorId, payableRows, setValue]);

  const bankPreview = computeBankAmount({
    amount,
    tds,
    retention,
    advanceRecovery,
    penalty,
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload = toCreatePaymentInput(values, projectId);
    try {
      if (mode === 'create') {
        await create.mutateAsync(payload);
        success('Contractor payment created as draft');
      } else if (mode === 'edit' && payment) {
        await update.mutateAsync({
          id: payment.id,
          input: {
            allocations: payload.allocations,
            paymentDate: payload.paymentDate,
            amount: payload.amount,
            paymentMode: payload.paymentMode,
            bankAccountId: payload.bankAccountId,
            transactionReference: payload.transactionReference,
            tds: payload.tds,
            retention: payload.retention,
            advanceRecovery: payload.advanceRecovery,
            penalty: payload.penalty,
            paymentProof: payload.paymentProof,
            notes: payload.notes,
          },
        });
        success('Contractor payment updated');
      }
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  });

  const title =
    mode === 'create'
      ? 'New contractor payment'
      : mode === 'edit'
        ? `Edit ${payment?.paymentNumber ?? 'payment'}`
        : (payment?.paymentNumber ?? 'Contractor payment');

  const saving = create.isPending || update.isPending;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 560, md: 640 } } },
      }}
    >
      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}
        data-testid="contractor-payment-form"
      >
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Allocate against posted running bills. Amount cannot exceed remaining
          net payable. Partial payments are supported.
        </Typography>

        <Stack spacing={2} sx={{ flex: 1, overflow: 'auto', pb: 2 }}>
          <Controller
            name="contractorId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="small">
                <InputLabel id="cp-contractor">Contractor</InputLabel>
                <Select
                  {...field}
                  labelId="cp-contractor"
                  label="Contractor"
                  disabled={readOnly || mode === 'edit'}
                >
                  <MenuItem value="">Select contractor</MenuItem>
                  {(contractors.data ?? []).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {[c.contractorCode, c.legalName]
                        .filter(Boolean)
                        .join(' — ')}
                    </MenuItem>
                  ))}
                  {contractorId &&
                  !(contractors.data ?? []).some(
                    (c) => c.id === contractorId,
                  ) ? (
                    <MenuItem value={contractorId}>
                      {contractorLabel(contractorId)}
                    </MenuItem>
                  ) : null}
                </Select>
              </FormControl>
            )}
          />

          <DateInput
            name="paymentDate"
            control={control}
            label="Payment date"
            disabled={readOnly}
          />

          <Controller
            name="paymentMode"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="small">
                <InputLabel id="cp-mode">Payment mode</InputLabel>
                <Select
                  {...field}
                  labelId="cp-mode"
                  label="Payment mode"
                  disabled={readOnly}
                >
                  {Object.values(ContractorPaymentMode).map((modeValue) => (
                    <MenuItem key={modeValue} value={modeValue}>
                      {paymentModeLabel(modeValue)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          <Controller
            name="bankAccountId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="small">
                <InputLabel id="cp-bank">Bank account</InputLabel>
                <Select
                  {...field}
                  labelId="cp-bank"
                  label="Bank account"
                  disabled={readOnly || !canViewBankAccounts}
                >
                  <MenuItem value="">Select bank account</MenuItem>
                  {(banks.data ?? []).map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.label || b.id.slice(-6)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          <FormTextField
            name="transactionReference"
            control={control}
            label="Transaction reference (UTR)"
            disabled={readOnly}
            helperText="Required and unique per bank account"
          />

          <Typography variant="subtitle2">Bill allocation</Typography>
          <BillAllocationEditor
            control={control}
            setValue={setValue}
            allocations={allocations}
            readOnly={readOnly}
            editable={editable}
            canViewRunningBills={canViewRunningBills}
            contractorSelected={Boolean(contractorId)}
            loading={payable.isLoading}
            emptyOnCreate={payableRows.length === 0 && mode === 'create'}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormTextField
              name="amount"
              control={control}
              label="Payment amount"
              type="number"
              disabled={readOnly}
            />
            <FormTextField
              name="tds"
              control={control}
              label="TDS"
              type="number"
              disabled={readOnly}
            />
            <FormTextField
              name="retention"
              control={control}
              label="Retention"
              type="number"
              disabled={readOnly}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormTextField
              name="advanceRecovery"
              control={control}
              label="Advance recovery"
              type="number"
              disabled={readOnly}
            />
            <FormTextField
              name="penalty"
              control={control}
              label="Penalty"
              type="number"
              disabled={readOnly}
            />
          </Stack>

          <Alert
            severity={bankPreview.ok ? 'info' : 'error'}
            variant="outlined"
            data-testid="payment-bank-amount"
          >
            Bank outflow:{' '}
            {bankPreview.ok
              ? formatInr(bankPreview.bankAmount)
              : bankPreview.message}
          </Alert>

          <FormTextField
            name="paymentProof"
            control={control}
            label="Payment proof id / path"
            disabled={readOnly}
          />
          <FormTextField
            name="notes"
            control={control}
            label="Notes"
            disabled={readOnly}
            multiline
            minRows={2}
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
          <Button onClick={onClose} disabled={saving}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {editable ? (
            <Button type="submit" variant="contained" disabled={saving}>
              {mode === 'create' ? 'Save draft' : 'Update draft'}
            </Button>
          ) : null}
        </Stack>
      </Box>
    </Drawer>
  );
}
