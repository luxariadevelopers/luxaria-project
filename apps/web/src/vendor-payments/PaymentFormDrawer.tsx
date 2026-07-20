import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Controller, useForm, useWatch } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { DateInput } from '@/components/forms/DateInput';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { paymentModeLabel } from './labels';
import {
  VendorPaymentMode,
  type PublicVendorPayment,
} from './types';
import {
  useBankAccountOptions,
  useCreateVendorPayment,
  usePayableInvoices,
  useUpdateVendorPayment,
  useVendorOptions,
} from './useVendorPayments';
import {
  computeBankAmount,
  filterPayableInvoices,
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
  payment: PublicVendorPayment | null;
  canCreate: boolean;
  canViewBankAccounts: boolean;
  canViewVendors: boolean;
  canViewInvoices: boolean;
  vendorLabel: (vendorId: string) => string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultValues(): PaymentFormValues {
  return {
    vendorId: '',
    paymentDate: todayIso(),
    amount: 0,
    paymentMode: VendorPaymentMode.Neft,
    bankAccountId: '',
    transactionReference: '',
    tds: 0,
    retention: 0,
    deductions: 0,
    paymentProof: '',
    notes: '',
    allocations: [],
  };
}

export function PaymentFormDrawer({
  open,
  onClose,
  mode,
  projectId,
  payment,
  canCreate,
  canViewBankAccounts,
  canViewVendors,
  canViewInvoices,
  vendorLabel,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateVendorPayment();
  const update = useUpdateVendorPayment();

  const readOnly = mode === 'view' || !canCreate;
  const editable = mode === 'create' || mode === 'edit';

  const { control, handleSubmit, reset, setValue } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: defaultValues(),
    mode: 'onBlur',
  });

  const vendorId = useWatch({ control, name: 'vendorId' });
  const amount = useWatch({ control, name: 'amount' }) ?? 0;
  const tds = useWatch({ control, name: 'tds' }) ?? 0;
  const retention = useWatch({ control, name: 'retention' }) ?? 0;
  const deductions = useWatch({ control, name: 'deductions' }) ?? 0;
  const allocations = useWatch({ control, name: 'allocations' }) ?? [];

  const vendors = useVendorOptions('', open && canViewVendors);
  const banks = useBankAccountOptions(
    projectId,
    open && canViewBankAccounts,
  );
  const payable = usePayableInvoices(
    projectId,
    vendorId || undefined,
    open && canViewInvoices && Boolean(vendorId),
  );

  const payableRows = useMemo(
    () => filterPayableInvoices(payable.data ?? []),
    [payable.data],
  );

  useEffect(() => {
    if (!open) return;
    if (payment && (mode === 'edit' || mode === 'view')) {
      reset({
        vendorId: payment.vendorId,
        paymentDate: payment.paymentDate.slice(0, 10),
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        bankAccountId: payment.bankAccountId,
        transactionReference: payment.transactionReference,
        tds: payment.tds,
        retention: payment.retention,
        deductions: payment.deductions,
        paymentProof: payment.paymentProof ?? '',
        notes: payment.notes ?? '',
        allocations: payment.allocations.map((a) => ({
          invoiceId: a.invoiceId,
          invoiceLabel:
            [a.invoiceDocumentNumber, a.invoiceNumber]
              .filter(Boolean)
              .join(' / ') || a.invoiceId.slice(-6),
          remainingPayable: a.amount,
          selected: true,
          amount: a.amount,
        })),
      });
      return;
    }
    reset(defaultValues());
  }, [open, payment, mode, reset]);

  useEffect(() => {
    if (!open || mode !== 'create' || !vendorId) return;
    setValue(
      'allocations',
      payableRows.map((inv) => ({
        invoiceId: inv.id,
        invoiceLabel: `${inv.documentNumber} / ${inv.invoiceNumber}`,
        remainingPayable: inv.remainingPayable,
        selected: false,
        amount: 0,
      })),
    );
  }, [open, mode, vendorId, payableRows, setValue]);

  const bankPreview = computeBankAmount({
    amount,
    tds,
    retention,
    deductions,
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload = toCreatePaymentInput(values, projectId);
    try {
      if (mode === 'create') {
        await create.mutateAsync(payload);
        success('Vendor payment created as draft');
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
            deductions: payload.deductions,
            paymentProof: payload.paymentProof,
            notes: payload.notes,
          },
        });
        success('Vendor payment updated');
      }
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  });

  const title =
    mode === 'create'
      ? 'New vendor payment'
      : mode === 'edit'
        ? `Edit ${payment?.paymentNumber ?? 'payment'}`
        : payment?.paymentNumber ?? 'Vendor payment';

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
        data-testid="vendor-payment-form-drawer"
      >
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Allocate against posted matched invoices. Amount cannot exceed
          remaining payable. Partial payments are supported.
        </Typography>

        <Stack spacing={2} sx={{ flex: 1, overflow: 'auto', pb: 2 }}>
          <Controller
            name="vendorId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="small">
                <InputLabel id="vp-vendor">Vendor</InputLabel>
                <Select
                  {...field}
                  labelId="vp-vendor"
                  label="Vendor"
                  disabled={readOnly || mode === 'edit'}
                >
                  <MenuItem value="">Select vendor</MenuItem>
                  {(vendors.data ?? []).map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {[v.vendorCode, v.legalName].filter(Boolean).join(' — ')}
                    </MenuItem>
                  ))}
                  {vendorId &&
                  !(vendors.data ?? []).some((v) => v.id === vendorId) ? (
                    <MenuItem value={vendorId}>
                      {vendorLabel(vendorId)}
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
                <InputLabel id="vp-mode">Payment mode</InputLabel>
                <Select
                  {...field}
                  labelId="vp-mode"
                  label="Payment mode"
                  disabled={readOnly}
                >
                  {Object.values(VendorPaymentMode).map((modeValue) => (
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
                <InputLabel id="vp-bank">Bank account</InputLabel>
                <Select
                  {...field}
                  labelId="vp-bank"
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

          <Typography variant="subtitle2">Payment allocation</Typography>
          {!canViewInvoices ? (
            <Alert severity="warning">
              Invoice allocation requires vendor_invoice.view.
            </Alert>
          ) : !vendorId ? (
            <Typography variant="body2" color="text.secondary">
              Select a vendor to load payable invoices.
            </Typography>
          ) : payable.isLoading ? (
            <Typography variant="body2">Loading invoices…</Typography>
          ) : payableRows.length === 0 && mode === 'create' ? (
            <Alert severity="info" data-testid="no-payable-invoices">
              No posted matched invoices with remaining payable for this vendor.
            </Alert>
          ) : (
            <Stack spacing={1} data-testid="payment-allocation-editor">
              {allocations.map((row, index) => (
                <Box
                  key={row.invoiceId}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1.5,
                  }}
                >
                  <Controller
                    name={`allocations.${index}.selected`}
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={field.value}
                            disabled={readOnly}
                            onChange={(e) => {
                              field.onChange(e.target.checked);
                              if (e.target.checked) {
                                setValue(
                                  `allocations.${index}.amount`,
                                  row.remainingPayable,
                                );
                              } else {
                                setValue(`allocations.${index}.amount`, 0);
                              }
                            }}
                          />
                        }
                        label={`${row.invoiceLabel} · payable ${formatInr(row.remainingPayable)}`}
                      />
                    )}
                  />
                  <Controller
                    name={`allocations.${index}.amount`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Allocate"
                        type="number"
                        size="small"
                        fullWidth
                        disabled={readOnly || !row.selected}
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                        slotProps={{
                          htmlInput: {
                            'data-testid': `allocation-amount-${row.invoiceId}`,
                          },
                        }}
                      />
                    )}
                  />
                </Box>
              ))}
              {editable ? (
                <Button
                  size="small"
                  onClick={() => {
                    const sum = allocations
                      .filter((a) => a.selected)
                      .reduce((s, a) => s + a.amount, 0);
                    setValue('amount', sum);
                  }}
                >
                  Set amount from allocations
                </Button>
              ) : null}
            </Stack>
          )}

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
            <FormTextField
              name="deductions"
              control={control}
              label="Deductions"
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
