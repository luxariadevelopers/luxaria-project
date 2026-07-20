import { useMemo } from 'react';
import {
  Alert,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import {
  useFieldArray,
  useWatch,
  type Control,
  type UseFormHandleSubmit,
} from 'react-hook-form';
import {
  DateInput,
  FormSection,
  FormTextField,
  MoneyInput,
} from '@/components/forms';
import { POAddressFields } from './POAddressFields';
import { POItemsGrid } from './POItemsGrid';
import { POTotalsBar } from './POTotalsBar';
import { previewPoTotals } from './totals';
import type { ApprovedSourceLine } from './types';
import {
  assertItemsMatchApprovedSource,
  assertOrderDeliveryDates,
  type PurchaseOrderFormValues,
} from './validation';

type Props = {
  control: Control<PurchaseOrderFormValues>;
  handleSubmit: UseFormHandleSubmit<PurchaseOrderFormValues>;
  sourceLines: readonly ApprovedSourceLine[];
  sourcingLabel?: string | null;
  busy?: boolean;
  onCancel: () => void;
  onSaveDraft: (values: PurchaseOrderFormValues) => void | Promise<void>;
  onSaveAndSubmit: (values: PurchaseOrderFormValues) => void | Promise<void>;
};

/**
 * Purchase order draft form — items, terms, addresses, and live totals.
 * Sourced from an approved/submitted vendor quotation.
 */
export function POForm({
  control,
  handleSubmit,
  sourceLines,
  sourcingLabel,
  busy = false,
  onCancel,
  onSaveDraft,
  onSaveAndSubmit,
}: Props) {
  const { fields } = useFieldArray({ control, name: 'items' });

  const watchedItems = useWatch({ control, name: 'items' });
  const taxes = useWatch({ control, name: 'taxes' }) ?? 0;
  const freight = useWatch({ control, name: 'freight' }) ?? 0;
  const discount = useWatch({ control, name: 'discount' }) ?? 0;
  const orderDate = useWatch({ control, name: 'orderDate' }) ?? '';
  const expectedDeliveryDate =
    useWatch({ control, name: 'expectedDeliveryDate' }) ?? '';

  const items = useMemo(() => watchedItems ?? [], [watchedItems]);

  const sourceByMaterialId = useMemo(
    () => new Map(sourceLines.map((line) => [line.materialId, line])),
    [sourceLines],
  );

  const totals = useMemo(
    () =>
      previewPoTotals({
        items,
        taxes: Number(taxes),
        freight: Number(freight),
        discount: Number(discount),
      }),
    [items, taxes, freight, discount],
  );

  const previewIssues = useMemo(() => {
    const issues: string[] = [];
    const dates = assertOrderDeliveryDates(orderDate, expectedDeliveryDate);
    if (!dates.ok) issues.push(dates.message);
    const source = assertItemsMatchApprovedSource(items, sourceLines);
    if (!source.ok) issues.push(source.message);
    return issues;
  }, [orderDate, expectedDeliveryDate, items, sourceLines]);

  const ready = previewIssues.length === 0 && items.length > 0;

  return (
    <Stack
      component="form"
      spacing={2.5}
      data-testid="po-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit((values) => onSaveDraft(values))();
      }}
    >
      {sourcingLabel ? (
        <Alert severity="info" variant="outlined">
          Generating PO from {sourcingLabel}. Rates stay locked to the approved
          quotation; reduce quantity if needed before submit.
        </Alert>
      ) : (
        <Alert severity="warning" variant="outlined">
          Open this form from sourcing with{' '}
          <code>selectedQuotationId</code> (and optional{' '}
          <code>purchaseRequestId</code>) so lines and vendor are prefilled.
        </Alert>
      )}

      <FormSection title="Header">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <DateInput
            name="orderDate"
            control={control}
            label="Order date"
            required
            disabled={busy}
          />
          <DateInput
            name="expectedDeliveryDate"
            control={control}
            label="Expected delivery"
            required
            disabled={busy}
          />
        </Stack>
        <FormTextField
          name="paymentTerms"
          control={control}
          label="Payment terms"
          disabled={busy}
        />
        <Typography variant="caption" color="text.secondary">
          Vendor and project are fixed from the selected quotation.
        </Typography>
      </FormSection>

      <POItemsGrid
        control={control}
        fields={fields}
        sourceByMaterialId={sourceByMaterialId}
        disabled={busy || sourceLines.length === 0}
      />

      <FormSection title="Charges">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <MoneyInput
            name="taxes"
            control={control}
            label="Header tax"
            disabled={busy}
          />
          <MoneyInput
            name="freight"
            control={control}
            label="Freight"
            disabled={busy}
          />
          <MoneyInput
            name="discount"
            control={control}
            label="Header discount"
            disabled={busy}
          />
        </Stack>
      </FormSection>

      <POAddressFields control={control} disabled={busy} />

      <FormSection title="Terms & conditions">
        <FormTextField
          name="terms"
          control={control}
          label="Terms"
          multiline
          minRows={3}
          disabled={busy}
        />
      </FormSection>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <POTotalsBar totals={totals} issues={previewIssues} />

        <Stack direction="row" spacing={1.5}>
          <Button type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="outlined"
            disabled={busy || !ready}
          >
            {busy ? 'Saving…' : 'Save draft'}
          </Button>
          <Button
            type="button"
            variant="contained"
            disabled={busy || !ready}
            onClick={() =>
              void handleSubmit((values) => onSaveAndSubmit(values))()
            }
          >
            {busy ? 'Submitting…' : 'Save & submit'}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
