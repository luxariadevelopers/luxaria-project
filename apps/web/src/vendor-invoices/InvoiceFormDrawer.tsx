import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form';
import { getErrorMessage, isConflictError } from '@/api/errors';
import { DateInput } from '@/components/forms/DateInput';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { InvoiceTaxTotals } from './InvoiceTaxTotals';
import {
  computeExpectedTotalAmount,
  roundMoney,
  sumLineAmounts,
} from './totals';
import type { PublicVendorInvoice } from './types';
import {
  useCreateVendorInvoice,
  useInvoiceableGoodsReceipts,
  useInvoiceablePurchaseOrders,
  usePurchaseOrderForInvoice,
  useUpdateVendorInvoice,
  useVendorOptions,
} from './useVendorInvoices';
import {
  aggregateGrnAcceptedByMaterial,
  findDuplicateVendorInvoice,
  findGrnQuantityOverages,
  invoiceFormSchema,
  isDuplicateVendorInvoiceMessage,
  toCreateInput,
  type InvoiceFormValues,
} from './validation';

export type InvoiceEntryMode = 'create' | 'edit' | 'view';

type Props = {
  open: boolean;
  onClose: () => void;
  mode: InvoiceEntryMode;
  projectId: string;
  invoice: PublicVendorInvoice | null;
  canCreate: boolean;
  canViewPurchaseOrders: boolean;
  canViewGoodsReceipts: boolean;
  canViewVendors: boolean;
  existingInvoices: readonly PublicVendorInvoice[];
  vendorLabel: (vendorId: string) => string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultValues(): InvoiceFormValues {
  const d = todayIso();
  return {
    invoiceNumber: '',
    vendorId: '',
    purchaseOrderId: '',
    grnIds: [],
    invoiceDate: d,
    dueDate: d,
    taxableValue: 0,
    gst: 0,
    tds: 0,
    retention: 0,
    freight: 0,
    discount: 0,
    totalAmount: 0,
    invoiceDocument: '',
    notes: '',
    items: [],
  };
}

export function InvoiceFormDrawer({
  open,
  onClose,
  mode,
  projectId,
  invoice,
  canCreate,
  canViewPurchaseOrders,
  canViewGoodsReceipts,
  canViewVendors,
  existingInvoices,
  vendorLabel,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateVendorInvoice();
  const update = useUpdateVendorInvoice();

  const readOnly = mode === 'view' || !canCreate;
  const editable = mode === 'create' || mode === 'edit';

  const { control, handleSubmit, reset, setValue, getValues } =
    useForm<InvoiceFormValues>({
      resolver: zodResolver(invoiceFormSchema),
      defaultValues: defaultValues(),
      mode: 'onBlur',
    });

  const { fields, replace } = useFieldArray({ control, name: 'items' });

  const vendorId = useWatch({ control, name: 'vendorId' });
  const purchaseOrderId = useWatch({ control, name: 'purchaseOrderId' });
  const watchedGrnIds = useWatch({ control, name: 'grnIds' });
  const watchedItemsRaw = useWatch({ control, name: 'items' });
  const taxableValue = useWatch({ control, name: 'taxableValue' }) ?? 0;
  const gst = useWatch({ control, name: 'gst' }) ?? 0;
  const freight = useWatch({ control, name: 'freight' }) ?? 0;
  const discount = useWatch({ control, name: 'discount' }) ?? 0;
  const tds = useWatch({ control, name: 'tds' }) ?? 0;
  const retention = useWatch({ control, name: 'retention' }) ?? 0;
  const totalAmount = useWatch({ control, name: 'totalAmount' }) ?? 0;
  const invoiceNumber = useWatch({ control, name: 'invoiceNumber' }) ?? '';

  const grnIds = useMemo(() => watchedGrnIds ?? [], [watchedGrnIds]);
  const watchedItems = useMemo(
    () => watchedItemsRaw ?? [],
    [watchedItemsRaw],
  );

  const vendors = useVendorOptions('', open && canViewVendors);
  const pos = useInvoiceablePurchaseOrders(
    projectId,
    vendorId || undefined,
    open && canViewPurchaseOrders && Boolean(vendorId),
  );
  const poDetail = usePurchaseOrderForInvoice(
    purchaseOrderId || undefined,
    open && Boolean(purchaseOrderId),
  );
  const grns = useInvoiceableGoodsReceipts(
    projectId,
    purchaseOrderId || undefined,
    vendorId || undefined,
    open && canViewGoodsReceipts && Boolean(purchaseOrderId),
  );

  useEffect(() => {
    if (!open) return;
    if (invoice && (mode === 'edit' || mode === 'view')) {
      reset({
        invoiceNumber: invoice.invoiceNumber,
        vendorId: invoice.vendorId,
        purchaseOrderId: invoice.purchaseOrderId,
        grnIds: [...invoice.grnIds],
        invoiceDate: invoice.invoiceDate.slice(0, 10),
        dueDate: invoice.dueDate.slice(0, 10),
        taxableValue: invoice.taxableValue,
        gst: invoice.gst,
        tds: invoice.tds,
        retention: invoice.retention,
        freight: invoice.freight,
        discount: invoice.discount,
        totalAmount: invoice.totalAmount,
        invoiceDocument: invoice.invoiceDocument ?? '',
        notes: invoice.notes ?? '',
        items: invoice.items.map((item) => ({
          materialId: item.materialId,
          materialLabel:
            [item.materialCode, item.materialName].filter(Boolean).join(' — ') ||
            item.materialId.slice(-6),
          purchaseOrderLineId: item.purchaseOrderLineId,
          quantity: item.quantity,
          unit: item.unit as InvoiceFormValues['items'][number]['unit'],
          rate: item.rate,
          tax: item.tax,
          grnAcceptedQuantity: item.grnAcceptedQuantity ?? 0,
        })),
      });
      return;
    }
    reset(defaultValues());
  }, [open, invoice, mode, reset]);

  // Prefill lines from PO when create + PO selected
  useEffect(() => {
    if (!open || mode !== 'create' || !poDetail.data) return;
    const accepted = aggregateGrnAcceptedByMaterial(
      grns.data ?? [],
      getValues('grnIds'),
    );
    replace(
      poDetail.data.items.map((line) => ({
        materialId: line.materialId,
        materialLabel:
          [line.materialCode, line.materialName].filter(Boolean).join(' — ') ||
          line.materialId.slice(-6),
        purchaseOrderLineId: line.id,
        quantity: Math.max(line.receivedQuantity, 0.000001),
        unit: line.unit as InvoiceFormValues['items'][number]['unit'],
        rate: line.rate,
        tax: line.tax,
        grnAcceptedQuantity: accepted.get(line.materialId) ?? 0,
      })),
    );
    const subtotal = sumLineAmounts(
      poDetail.data.items.map((line) => ({
        quantity: Math.max(line.receivedQuantity, 0.000001),
        rate: line.rate,
        tax: line.tax,
      })),
    );
    setValue('taxableValue', subtotal);
    setValue(
      'totalAmount',
      computeExpectedTotalAmount({
        taxableValue: subtotal,
        gst: getValues('gst'),
        freight: getValues('freight'),
      }),
    );
    if (!getValues('vendorId')) {
      setValue('vendorId', poDetail.data.vendorId);
    }
  }, [
    open,
    mode,
    poDetail.data,
    grns.data,
    replace,
    setValue,
    getValues,
  ]);

  // Refresh accepted qty hints when GRN selection changes
  useEffect(() => {
    if (!open || !editable) return;
    const accepted = aggregateGrnAcceptedByMaterial(grns.data ?? [], grnIds);
    const items = getValues('items');
    if (!items.length) return;
    replace(
      items.map((item) => ({
        ...item,
        grnAcceptedQuantity: accepted.get(item.materialId) ?? 0,
      })),
    );
  }, [grnIds, grns.data, open, editable, getValues, replace]);

  const duplicate = useMemo(() => {
    if (!vendorId || !invoiceNumber.trim()) return null;
    return findDuplicateVendorInvoice(
      existingInvoices,
      vendorId,
      invoiceNumber,
      invoice?.id,
    );
  }, [existingInvoices, vendorId, invoiceNumber, invoice?.id]);

  const qtyOverages = useMemo(() => {
    const accepted = aggregateGrnAcceptedByMaterial(grns.data ?? [], grnIds);
    return findGrnQuantityOverages(
      watchedItems.map((item) => ({
        materialId: item.materialId,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        tax: item.tax,
      })),
      accepted,
    );
  }, [watchedItems, grns.data, grnIds]);

  const onSubmit = handleSubmit(async (values) => {
    if (duplicate) {
      notifyError(
        `Duplicate vendor invoice number ${duplicate.invoiceNumber} for this vendor (${duplicate.documentNumber}).`,
      );
      return;
    }
    const payload = toCreateInput(values, projectId);
    try {
      if (mode === 'create') {
        await create.mutateAsync(payload);
        success('Vendor invoice created as draft');
      } else if (mode === 'edit' && invoice) {
        await update.mutateAsync({
          id: invoice.id,
          input: {
            invoiceNumber: payload.invoiceNumber,
            grnIds: payload.grnIds,
            invoiceDate: payload.invoiceDate,
            dueDate: payload.dueDate,
            taxableValue: payload.taxableValue,
            gst: payload.gst,
            tds: payload.tds,
            retention: payload.retention,
            freight: payload.freight,
            discount: payload.discount,
            totalAmount: payload.totalAmount,
            invoiceDocument: payload.invoiceDocument,
            notes: payload.notes,
            items: payload.items,
          },
        });
        success('Vendor invoice updated');
      }
      onClose();
    } catch (err) {
      const message = getErrorMessage(err);
      if (isConflictError(err) || isDuplicateVendorInvoiceMessage(message)) {
        notifyError(message || 'Duplicate vendor invoice number for this vendor');
      } else {
        notifyError(message);
      }
    }
  });

  const title =
    mode === 'create'
      ? 'New vendor invoice'
      : mode === 'edit'
        ? `Edit ${invoice?.documentNumber ?? 'invoice'}`
        : invoice?.documentNumber ?? 'Vendor invoice';

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
        data-testid="vendor-invoice-form-drawer"
      >
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Capture against a PO and accepted GRNs. Duplicate vendor invoice
          numbers are rejected.
        </Typography>

        <Stack spacing={2} sx={{ flex: 1, overflow: 'auto', pb: 2 }}>
          {duplicate ? (
            <Alert severity="warning" data-testid="duplicate-invoice-warning">
              Duplicate vendor invoice number {duplicate.invoiceNumber} already
              exists ({duplicate.documentNumber}).
            </Alert>
          ) : null}

          {qtyOverages.length > 0 ? (
            <Alert severity="warning" data-testid="grn-qty-overage-warning">
              Invoice quantity exceeds GRN accepted for{' '}
              {qtyOverages.length} material(s). Matching will raise an
              exception unless within tolerance.
            </Alert>
          ) : null}

          {!canViewVendors ? (
            <Alert severity="info">
              Vendor picker needs vendor.view. Enter vendor via an open PO.
            </Alert>
          ) : null}

          <Controller
            name="vendorId"
            control={control}
            render={({ field, fieldState }) => (
              <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
                <InputLabel id="vi-vendor">Vendor</InputLabel>
                <Select
                  {...field}
                  labelId="vi-vendor"
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

          <FormTextField
            name="invoiceNumber"
            control={control}
            label="Vendor invoice number"
            disabled={readOnly}
            helperText="Unique per vendor (normalized uppercase)"
          />

          <Controller
            name="purchaseOrderId"
            control={control}
            render={({ field, fieldState }) => (
              <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
                <InputLabel id="vi-po">Purchase order</InputLabel>
                <Select
                  {...field}
                  labelId="vi-po"
                  label="Purchase order"
                  disabled={
                    readOnly ||
                    mode === 'edit' ||
                    !vendorId ||
                    !canViewPurchaseOrders
                  }
                  onChange={(e) => {
                    field.onChange(e);
                    setValue('grnIds', []);
                  }}
                >
                  <MenuItem value="">Select PO</MenuItem>
                  {(pos.data ?? []).map((po) => (
                    <MenuItem key={po.id} value={po.id}>
                      {po.purchaseOrderNumber} · {po.status}
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error ? (
                  <Typography variant="caption" color="error">
                    {fieldState.error.message}
                  </Typography>
                ) : null}
              </FormControl>
            )}
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Goods receipts (accepted / posted)
            </Typography>
            {!canViewGoodsReceipts ? (
              <Alert severity="warning">
                GRN selector requires grn.create.
              </Alert>
            ) : !purchaseOrderId ? (
              <Typography variant="body2" color="text.secondary">
                Select a purchase order first.
              </Typography>
            ) : grns.isLoading ? (
              <Typography variant="body2">Loading GRNs…</Typography>
            ) : (grns.data ?? []).length === 0 ? (
              <Alert severity="info">
                No accepted or posted GRNs for this PO.
              </Alert>
            ) : (
              <Controller
                name="grnIds"
                control={control}
                render={({ field }) => (
                  <FormGroup data-testid="invoice-grn-selector">
                    {(grns.data ?? []).map((grn) => {
                      const checked = field.value.includes(grn.id);
                      return (
                        <FormControlLabel
                          key={grn.id}
                          control={
                            <Checkbox
                              checked={checked}
                              disabled={readOnly}
                              onChange={() => {
                                const next = checked
                                  ? field.value.filter((id) => id !== grn.id)
                                  : [...field.value, grn.id];
                                field.onChange(next);
                              }}
                            />
                          }
                          label={`${grn.grnNumber} · ${grn.status}`}
                        />
                      );
                    })}
                  </FormGroup>
                )}
              />
            )}
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <DateInput
              name="invoiceDate"
              control={control}
              label="Invoice date"
              disabled={readOnly}
            />
            <DateInput
              name="dueDate"
              control={control}
              label="Due date"
              disabled={readOnly}
            />
          </Stack>

          <Divider />
          <Typography variant="subtitle2">Line items</Typography>
          {fields.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Select a PO to load materials.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {fields.map((field, index) => {
                const item = watchedItems[index];
                const over =
                  item &&
                  item.quantity - (item.grnAcceptedQuantity ?? 0) > 1e-9;
                return (
                  <Box
                    key={field.id}
                    sx={{
                      border: 1,
                      borderColor: over ? 'warning.main' : 'divider',
                      borderRadius: 1,
                      p: 1.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item?.materialLabel ?? field.materialLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      GRN accepted: {item?.grnAcceptedQuantity ?? 0}
                      {over ? ' · exceeds accepted qty' : ''}
                    </Typography>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      sx={{ mt: 1 }}
                    >
                      <Controller
                        name={`items.${index}.quantity`}
                        control={control}
                        render={({ field: f }) => (
                          <TextField
                            {...f}
                            label="Qty"
                            type="number"
                            size="small"
                            disabled={readOnly}
                            onChange={(e) =>
                              f.onChange(Number(e.target.value))
                            }
                          />
                        )}
                      />
                      <Controller
                        name={`items.${index}.rate`}
                        control={control}
                        render={({ field: f }) => (
                          <TextField
                            {...f}
                            label="Rate"
                            type="number"
                            size="small"
                            disabled={readOnly}
                            onChange={(e) =>
                              f.onChange(Number(e.target.value))
                            }
                          />
                        )}
                      />
                      <Controller
                        name={`items.${index}.tax`}
                        control={control}
                        render={({ field: f }) => (
                          <TextField
                            {...f}
                            label="Tax"
                            type="number"
                            size="small"
                            disabled={readOnly}
                            onChange={(e) =>
                              f.onChange(Number(e.target.value))
                            }
                          />
                        )}
                      />
                      <Typography
                        variant="body2"
                        sx={{ alignSelf: 'center', minWidth: 90 }}
                      >
                        {formatInr(
                          roundMoney(
                            (item?.quantity ?? 0) * (item?.rate ?? 0) +
                              (item?.tax ?? 0),
                          ),
                        )}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}

          <Divider />
          <Typography variant="subtitle2">Tax totals</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormTextField
              name="taxableValue"
              control={control}
              label="Taxable value"
              type="number"
              disabled={readOnly}
            />
            <FormTextField
              name="gst"
              control={control}
              label="GST"
              type="number"
              disabled={readOnly}
            />
            <FormTextField
              name="freight"
              control={control}
              label="Freight"
              type="number"
              disabled={readOnly}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormTextField
              name="discount"
              control={control}
              label="Discount"
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
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <FormTextField
              name="totalAmount"
              control={control}
              label="Total amount"
              type="number"
              disabled={readOnly}
            />
            {editable ? (
              <Button
                size="small"
                onClick={() =>
                  setValue(
                    'totalAmount',
                    computeExpectedTotalAmount({
                      taxableValue,
                      gst,
                      freight,
                    }),
                  )
                }
              >
                Recalc
              </Button>
            ) : null}
          </Stack>

          <InvoiceTaxTotals
            taxableValue={taxableValue}
            gst={gst}
            freight={freight}
            discount={discount}
            tds={tds}
            retention={retention}
            totalAmount={totalAmount}
          />

          <FormTextField
            name="invoiceDocument"
            control={control}
            label="Invoice document id / path"
            disabled={readOnly}
            helperText="Optional supporting evidence reference"
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
