import { useEffect, useMemo } from 'react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import {
  Controller,
  useFormContext,
  useWatch,
  type Control,
} from 'react-hook-form';
import {
  DateInput,
  FormSection,
  FormSelect,
  FormTextField,
  MoneyInput,
} from '@/components/forms';
import { formatInr } from '@/format';
import { syncBoqItemDerivedTotals, type BoqItemFormValues } from './validation';
import {
  BOQ_ITEM_STATUS_OPTIONS,
  BOQ_UNIT_OPTIONS,
  formatBoqVersionLabel,
} from './labels';
import type { BoqHierarchyBlock, PublicBoqVersion } from './types';

type Props = {
  control: Control<BoqItemFormValues>;
  hierarchy: readonly BoqHierarchyBlock[];
  versions: readonly PublicBoqVersion[];
  disabled?: boolean;
  /** Create mode shows version picker; edit locks location ids from item. */
  mode: 'create' | 'edit';
};

/**
 * Draft BOQ item form — cost components, dates, subcontract (contractor cost),
 * and work location via Block → Floor → Work category (Nest has no contractor FK).
 */
export function ItemForm({
  control,
  hierarchy,
  versions,
  disabled = false,
  mode,
}: Props) {
  const { setValue } = useFormContext<BoqItemFormValues>();
  const blockId = useWatch({ control, name: 'blockId' });
  const floorId = useWatch({ control, name: 'floorId' });
  const materialCost = useWatch({ control, name: 'materialCost' });
  const labourCost = useWatch({ control, name: 'labourCost' });
  const subcontractCost = useWatch({ control, name: 'subcontractCost' });
  const otherCost = useWatch({ control, name: 'otherCost' });
  const plannedQuantity = useWatch({ control, name: 'plannedQuantity' });
  const plannedRate = useWatch({ control, name: 'plannedRate' });
  const plannedValue = useWatch({ control, name: 'plannedValue' });

  const floors = useMemo(() => {
    const block = hierarchy.find((b) => b.id === blockId);
    return block?.floors ?? [];
  }, [hierarchy, blockId]);

  const categories = useMemo(() => {
    const floor = floors.find((f) => f.id === floorId);
    return floor?.workCategories ?? [];
  }, [floors, floorId]);

  const draftVersions = useMemo(
    () =>
      versions.filter(
        (v) => v.status === 'draft' || v.status === 'rejected',
      ),
    [versions],
  );

  const workCategoryId = useWatch({ control, name: 'workCategoryId' });

  useEffect(() => {
    if (mode !== 'create') return;
    if (floorId && !floors.some((f) => f.id === floorId)) {
      setValue('floorId', '');
      setValue('workCategoryId', '');
    }
  }, [mode, floorId, floors, setValue]);

  useEffect(() => {
    if (mode !== 'create') return;
    if (
      workCategoryId &&
      !categories.some((c) => c.id === workCategoryId)
    ) {
      setValue('workCategoryId', '');
    }
  }, [mode, workCategoryId, categories, setValue]);

  useEffect(() => {
    const derived = syncBoqItemDerivedTotals({
      materialCost: Number(materialCost) || 0,
      labourCost: Number(labourCost) || 0,
      subcontractCost: Number(subcontractCost) || 0,
      otherCost: Number(otherCost) || 0,
      plannedQuantity: Number(plannedQuantity) || 0,
    });
    if (derived.plannedRate !== plannedRate) {
      setValue('plannedRate', derived.plannedRate, { shouldValidate: true });
    }
    if (derived.plannedValue !== plannedValue) {
      setValue('plannedValue', derived.plannedValue, { shouldValidate: true });
    }
  }, [
    materialCost,
    labourCost,
    subcontractCost,
    otherCost,
    plannedQuantity,
    plannedRate,
    plannedValue,
    setValue,
  ]);

  const blockOptions = hierarchy.map((b) => ({
    value: b.id,
    label: `${b.blockCode} — ${b.name}`,
  }));
  const floorOptions = floors.map((f) => ({
    value: f.id,
    label: `${f.floorCode} — ${f.name}`,
  }));
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: `${c.categoryCode} — ${c.name}`,
  }));
  const versionOptions = draftVersions.map((v) => ({
    value: v.id,
    label: formatBoqVersionLabel(v),
  }));

  return (
    <Stack spacing={2.5} data-testid="boq-item-form">
      <FormSection
        title="Work location"
        description="Block → floor → work category (Nest BOQ hierarchy). There is no separate contractor entity on BOQ items."
        disabled={disabled || mode === 'edit'}
      >
        <Stack spacing={2}>
          <FormSelect
            name="blockId"
            control={control}
            label="Block"
            options={blockOptions}
            disabled={disabled || mode === 'edit'}
            required
          />
          <FormSelect
            name="floorId"
            control={control}
            label="Floor"
            options={floorOptions}
            disabled={disabled || mode === 'edit' || !blockId}
            required
          />
          <FormSelect
            name="workCategoryId"
            control={control}
            label="Work category"
            options={categoryOptions}
            disabled={disabled || mode === 'edit' || !floorId}
            required
          />
        </Stack>
      </FormSection>

      <FormSection
        title="Item"
        description="Code is optional on create (server auto-generates BOQ-YYYY-######)."
        disabled={disabled}
      >
        <Stack spacing={2}>
          {mode === 'create' && versionOptions.length > 0 && (
            <FormSelect
              name="versionId"
              control={control}
              label="Draft version"
              options={[
                { value: '', label: 'Default (project draft / Original)' },
                ...versionOptions,
              ]}
              disabled={disabled}
            />
          )}
          <FormTextField
            name="boqCode"
            control={control}
            label="BOQ code"
            disabled={disabled || mode === 'edit'}
            helperText={
              mode === 'edit'
                ? 'Code is immutable after create'
                : 'Leave blank to auto-generate'
            }
          />
          <FormTextField
            name="description"
            control={control}
            label="Description"
            disabled={disabled}
            required
            multiline
            minRows={2}
          />
          <FormSelect
            name="unit"
            control={control}
            label="Unit"
            options={BOQ_UNIT_OPTIONS}
            disabled={disabled}
            required
          />
          <Controller
            name="plannedQuantity"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                label="Planned quantity"
                type="number"
                fullWidth
                required
                disabled={disabled}
                value={field.value ?? ''}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  field.onChange(Number.isFinite(n) ? n : 0);
                }}
                onBlur={field.onBlur}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                inputProps={{ min: 0, step: 'any' }}
              />
            )}
          />
          <FormSelect
            name="status"
            control={control}
            label="Status"
            options={BOQ_ITEM_STATUS_OPTIONS}
            disabled={disabled}
          />
          <FormTextField
            name="notes"
            control={control}
            label="Notes"
            disabled={disabled}
            multiline
            minRows={2}
          />
        </Stack>
      </FormSection>

      <FormSection
        title="Cost components"
        description="plannedRate = material + labour + subcontract + other; plannedValue = qty × rate."
        disabled={disabled}
      >
        <Stack spacing={2}>
          <MoneyInput
            name="materialCost"
            control={control}
            label="Material cost"
            disabled={disabled}
          />
          <MoneyInput
            name="labourCost"
            control={control}
            label="Labour cost"
            disabled={disabled}
          />
          <MoneyInput
            name="subcontractCost"
            control={control}
            label="Subcontract / contractor cost"
            disabled={disabled}
            helperText="Nest field subcontractCost (no contractorId on BOQ items)."
          />
          <MoneyInput
            name="otherCost"
            control={control}
            label="Other cost"
            disabled={disabled}
          />
          <MoneyInput
            name="plannedRate"
            control={control}
            label="Planned rate"
            disabled
            helperText="Computed from cost components"
          />
          <MoneyInput
            name="plannedValue"
            control={control}
            label="Planned value"
            disabled
            helperText={`Computed: ${formatInr(Number(plannedValue) || 0)}`}
          />
          <Alert severity="info" variant="outlined">
            Totals must stay consistent with Nest validation (tolerance 0.005).
          </Alert>
        </Stack>
      </FormSection>

      <FormSection
        title="Schedule dates"
        description="endDate cannot be before startDate."
        disabled={disabled}
      >
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
          <DateInput
            name="startDate"
            control={control}
            label="Start date"
            disabled={disabled}
          />
          <DateInput
            name="endDate"
            control={control}
            label="End date"
            disabled={disabled}
          />
        </Stack>
      </FormSection>

      {hierarchy.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No BOQ hierarchy yet. Create blocks / floors / work categories
          (Phase 077 list) before adding items.
        </Typography>
      )}
    </Stack>
  );
}
