import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { QuotationDocumentUpload } from './QuotationDocumentUpload';
import { QuotationLineItemsEditor } from './QuotationLineItemsEditor';
import { QuotationTotalsSummary } from './QuotationTotalsSummary';
import { previewQuotationTotals } from './totals';
import type { PublicVendorQuotation } from './types';
import {
  useCreateVendorQuotation,
  useEligiblePurchaseRequests,
  usePurchaseRequestForQuote,
  useReviseVendorQuotation,
  useUpdateVendorQuotation,
  useUploadVendorQuotationDocument,
  useVendorOptions,
} from './useQuotations';
import {
  assertSelectedPrItems,
  buildFormItemsFromPr,
  defaultQuotationFormValues,
  quotationFormSchema,
  shapeQuotationPayload,
  type QuotationFormValues,
} from './validation';

export type QuotationEntryMode = 'create' | 'edit' | 'revise' | 'view';

type Props = {
  open: boolean;
  onClose: () => void;
  mode: QuotationEntryMode;
  projectId: string;
  quotation: PublicVendorQuotation | null;
  canManage: boolean;
  /** Prefill vendor labels already known from the list. */
  vendorLabel: (vendorId: string) => string;
};

export function QuotationEntryDrawer({
  open,
  onClose,
  mode,
  projectId,
  quotation,
  canManage,
  vendorLabel,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateVendorQuotation();
  const update = useUpdateVendorQuotation();
  const revise = useReviseVendorQuotation();
  const upload = useUploadVendorQuotationDocument();

  const readOnly = mode === 'view' || !canManage;
  const editable = mode === 'create' || mode === 'edit' || mode === 'revise';

  const { control, handleSubmit, reset, setValue, getValues } =
    useForm<QuotationFormValues>({
      resolver: zodResolver(quotationFormSchema),
      defaultValues: defaultQuotationFormValues(),
      mode: 'onBlur',
    });

  const { fields, replace } = useFieldArray({ control, name: 'items' });

  const purchaseRequestId = useWatch({ control, name: 'purchaseRequestId' });
  const watchedItems = useWatch({ control, name: 'items' });
  const freight = useWatch({ control, name: 'freight' }) ?? 0;
  const taxes = useWatch({ control, name: 'taxes' }) ?? 0;
  const discount = useWatch({ control, name: 'discount' }) ?? 0;

  const eligiblePrs = useEligiblePurchaseRequests(
    projectId,
    open && (mode === 'create' || Boolean(purchaseRequestId)),
  );
  const prDetail = usePurchaseRequestForQuote(
    purchaseRequestId || undefined,
    open && Boolean(purchaseRequestId),
  );
  const vendors = useVendorOptions('', open && editable);

  useEffect(() => {
    if (!open) return;

    if (mode === 'create') {
      reset(defaultQuotationFormValues());
      replace([]);
      return;
    }

    if (!quotation) return;

    reset(
      defaultQuotationFormValues({
        purchaseRequestId: quotation.purchaseRequestId,
        vendorId: quotation.vendorId,
        quotationDate: quotation.quotationDate.slice(0, 10),
        validityDate: quotation.validityDate.slice(0, 10),
        deliveryDays: quotation.deliveryDays,
        paymentTerms: quotation.paymentTerms ?? '',
        freight: quotation.freight,
        taxes: quotation.taxes,
        discount: quotation.discount,
        items: [],
      }),
    );
  }, [open, mode, quotation, reset, replace]);

  useEffect(() => {
    if (!open || !prDetail.data) return;
    if (mode === 'create' && !quotation) {
      const items = buildFormItemsFromPr(prDetail.data.items);
      replace(items);
      setValue('items', items, { shouldValidate: true });
      return;
    }
    if (quotation && purchaseRequestId === quotation.purchaseRequestId) {
      const items = buildFormItemsFromPr(prDetail.data.items, quotation.items);
      replace(items);
      setValue('items', items, { shouldValidate: true });
    }
  }, [
    open,
    mode,
    quotation,
    prDetail.data,
    purchaseRequestId,
    replace,
    setValue,
  ]);

  const totals = useMemo(() => {
    const selected = (watchedItems ?? []).filter((item) => item.selected);
    return previewQuotationTotals({
      items: selected,
      freight: Number(freight),
      taxes: Number(taxes),
      discount: Number(discount),
    });
  }, [watchedItems, freight, taxes, discount]);

  const title =
    mode === 'create'
      ? 'New vendor quotation'
      : mode === 'edit'
        ? `Edit ${quotation?.quotationNumber ?? 'draft'}`
        : mode === 'revise'
          ? `Revise ${quotation?.quotationNumber ?? 'quotation'}`
          : quotation?.quotationNumber ?? 'Quotation';

  const onSubmit = async (values: QuotationFormValues) => {
    if (!editable || readOnly) return;
    if (prDetail.data) {
      const selectedIds = values.items
        .filter((item) => item.selected)
        .map((item) => item.materialId);
      const prCheck = assertSelectedPrItems(selectedIds, prDetail.data.items);
      if (!prCheck.ok) {
        notifyError(prCheck.message);
        return;
      }
    }

    const payload = shapeQuotationPayload(values);
    try {
      if (mode === 'create') {
        const created = await create.mutateAsync(payload);
        success(`Draft ${created.quotationNumber} created`);
        onClose();
        return;
      }
      if (mode === 'edit' && quotation) {
        const { purchaseRequestId: _pr, ...updateBody } = payload;
        await update.mutateAsync({ id: quotation.id, input: updateBody });
        success('Draft quotation updated');
        onClose();
        return;
      }
      if (mode === 'revise' && quotation) {
        const { purchaseRequestId: _pr, ...reviseBody } = payload;
        const next = await revise.mutateAsync({
          id: quotation.id,
          input: reviseBody,
        });
        success(`Revision ${next.quotationNumber} created as draft`);
        onClose();
      }
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const saving = create.isPending || update.isPending || revise.isPending;

  const vendorOptions = useMemo(() => {
    const fromApi = vendors.data ?? [];
    const currentId = getValues('vendorId') || quotation?.vendorId;
    if (
      currentId &&
      !fromApi.some((v) => v.id === currentId)
    ) {
      return [
        {
          id: currentId,
          vendorCode: '',
          legalName: vendorLabel(currentId),
          status: 'active',
        },
        ...fromApi,
      ];
    }
    return fromApi;
  }, [vendors.data, getValues, quotation, vendorLabel]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', md: 720 } } },
      }}
    >
      <Box
        sx={{ p: 2.5 }}
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        data-testid="quotation-entry-drawer"
      >
        <Stack spacing={2}>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            Nest: POST/PATCH/revise on `/vendor-quotations`. Create & revise
            require quotation.manage. Validity ≥ quote date; line total =
            qty × rate − discount + tax.
          </Typography>

          {eligiblePrs.isError ? (
            <RetryPanel
              error={eligiblePrs.error}
              onRetry={() => void eligiblePrs.refetch()}
              forceRetry
            />
          ) : null}

          {mode === 'create' ? (
            <Controller
              name="purchaseRequestId"
              control={control}
              render={({ field, fieldState }) => (
                <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
                  <InputLabel id="quotation-pr">Purchase request</InputLabel>
                  <Select
                    labelId="quotation-pr"
                    label="Purchase request"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={readOnly}
                  >
                    {(eligiblePrs.data ?? []).map((pr) => (
                      <MenuItem key={pr.id} value={pr.id}>
                        {pr.requestNumber} · {pr.status}
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
          ) : (
            <Alert severity="info" variant="outlined">
              Purchase request:{' '}
              {quotation?.purchaseRequestId ?? purchaseRequestId}
            </Alert>
          )}

          <Controller
            name="vendorId"
            control={control}
            render={({ field, fieldState }) => (
              <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
                <InputLabel id="quotation-vendor">Vendor</InputLabel>
                <Select
                  labelId="quotation-vendor"
                  label="Vendor"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={readOnly}
                >
                  {vendorOptions.map((vendor) => (
                    <MenuItem key={vendor.id} value={vendor.id}>
                      {[vendor.vendorCode, vendor.legalName]
                        .filter(Boolean)
                        .join(' — ') || vendor.id}
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

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormTextField
              name="quotationDate"
              control={control}
              label="Quotation date"
              type="date"
              required
              disabled={readOnly}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormTextField
              name="validityDate"
              control={control}
              label="Validity date"
              type="date"
              required
              disabled={readOnly}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormTextField
              name="deliveryDays"
              control={control}
              label="Delivery days"
              type="number"
              disabled={readOnly}
            />
            <FormTextField
              name="paymentTerms"
              control={control}
              label="Payment terms"
              disabled={readOnly}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormTextField
              name="freight"
              control={control}
              label="Freight"
              type="number"
              disabled={readOnly}
            />
            <FormTextField
              name="taxes"
              control={control}
              label="Header taxes"
              type="number"
              disabled={readOnly}
            />
            <FormTextField
              name="discount"
              control={control}
              label="Header discount"
              type="number"
              disabled={readOnly}
            />
          </Stack>

          {prDetail.isError ? (
            <RetryPanel
              error={prDetail.error}
              onRetry={() => void prDetail.refetch()}
              forceRetry
            />
          ) : prDetail.isLoading && purchaseRequestId ? (
            <Typography color="text.secondary">Loading PR items…</Typography>
          ) : (
            <QuotationLineItemsEditor
              control={control}
              fields={fields}
              setValue={setValue}
              readOnly={readOnly}
            />
          )}

          <QuotationTotalsSummary
            itemsSubtotal={totals.itemsSubtotal}
            freight={Number(freight)}
            taxes={Number(taxes)}
            discount={Number(discount)}
            grandTotal={totals.grandTotal}
          />

          {quotation && mode !== 'create' ? (
            <>
              <Divider />
              <QuotationDocumentUpload
                quotation={quotation}
                canUpload={canManage && mode === 'edit'}
                uploading={upload.isPending}
                onUpload={async (file) => {
                  try {
                    await upload.mutateAsync({ id: quotation.id, file });
                    success('Quotation document uploaded');
                  } catch (err) {
                    notifyError(getErrorMessage(err));
                  }
                }}
              />
            </>
          ) : null}

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Close</Button>
            {editable && !readOnly ? (
              <Button type="submit" variant="contained" disabled={saving}>
                {saving
                  ? 'Saving…'
                  : mode === 'revise'
                    ? 'Create revision'
                    : mode === 'edit'
                      ? 'Save draft'
                      : 'Create draft'}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
