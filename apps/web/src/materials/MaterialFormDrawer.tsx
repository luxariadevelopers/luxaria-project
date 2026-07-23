import { useEffect, useMemo } from 'react';
import { formDrawerPaperSx } from '@/components/forms';
import {
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form';
import { getErrorMessage } from '@/api/client';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { MATERIAL_STATUS_OPTIONS, MATERIAL_UNIT_OPTIONS } from './labels';
import {
  MaterialStatus,
  MaterialUnit,
  type PublicMaterial,
} from './types';
import { useCreateMaterial, useUpdateMaterial } from './useMaterials';
import {
  materialFormSchema,
  toCreateMaterialInput,
  type MaterialFormValues,
} from './validation';

type LedgerOption = { id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  material?: PublicMaterial | null;
  ledgerOptions: readonly LedgerOption[];
  canViewAccounts: boolean;
};

const EMPTY_VALUES: MaterialFormValues = {
  name: '',
  category: '',
  specification: '',
  brand: '',
  baseUnit: MaterialUnit.Bag,
  alternateUnits: [],
  conversionFactors: [],
  standardRate: 0,
  minimumStock: 0,
  reorderLevel: 0,
  maximumStock: 0,
  standardWastagePercentage: 0,
  ledgerAccountId: '',
  status: MaterialStatus.Active,
};

function toFormValues(material: PublicMaterial): MaterialFormValues {
  return {
    name: material.name,
    category: material.category,
    specification: material.specification ?? '',
    brand: material.brand ?? '',
    baseUnit: material.baseUnit,
    alternateUnits: [...material.alternateUnits],
    conversionFactors: material.conversionFactors.map((f) => ({
      unit: f.unit,
      factorToBase: f.factorToBase,
    })),
    standardRate: material.standardRate,
    minimumStock: material.minimumStock,
    reorderLevel: material.reorderLevel,
    maximumStock: material.maximumStock,
    standardWastagePercentage: material.standardWastagePercentage,
    ledgerAccountId: material.ledgerAccountId,
    status: material.status,
  };
}

export function MaterialFormDrawer({
  open,
  onClose,
  mode,
  material,
  ledgerOptions,
  canViewAccounts,
}: Props) {
  const create = useCreateMaterial();
  const update = useUpdateMaterial();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset, getValues } =
    useForm<MaterialFormValues>({
      resolver: zodResolver(materialFormSchema),
      defaultValues: EMPTY_VALUES,
    });

  const baseUnit = useWatch({ control, name: 'baseUnit' });
  const watchedAlternates = useWatch({ control, name: 'alternateUnits' });
  const alternateUnits = useMemo(
    () => watchedAlternates ?? [],
    [watchedAlternates],
  );
  const { fields, replace } = useFieldArray({
    control,
    name: 'conversionFactors',
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && material) {
      reset(toFormValues(material));
    } else {
      reset(EMPTY_VALUES);
    }
  }, [open, mode, material, reset]);

  const alternateKey = alternateUnits.join('|');
  useEffect(() => {
    if (!open) return;
    const current = getValues('conversionFactors') ?? [];
    const units = alternateKey ? alternateKey.split('|') : [];
    replace(
      units.map((unit) => {
        const typed = unit as MaterialUnit;
        const existing = current.find((f) => f.unit === typed);
        return {
          unit: typed,
          factorToBase: existing?.factorToBase ?? 1,
        };
      }),
    );
  }, [alternateKey, open, replace, getValues]);

  const unitOptions = useMemo(
    () =>
      MATERIAL_UNIT_OPTIONS.map((opt) => ({
        value: opt.value,
        label: opt.label,
      })),
    [],
  );

  const alternateChoices = unitOptions.filter((o) => o.value !== baseUnit);

  const ledgerSelectOptions = ledgerOptions.map((o) => ({
    value: o.id,
    label: o.label,
  }));

  const baseUnitLocked = mode === 'edit' && Boolean(material?.baseUnitLocked);
  const saving = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const payload = toCreateMaterialInput(values);
    try {
      if (mode === 'create') {
        await create.mutateAsync(payload);
        success('Material created');
      } else if (material) {
        await update.mutateAsync({ id: material.id, input: payload });
        success('Material updated');
      }
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'Save failed'));
    }
  });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: formDrawerPaperSx(480) } }}
    >
      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}
        data-testid="material-form-drawer"
      >
        <Typography variant="h5" sx={{ mb: 2 }}>
          {mode === 'create' ? 'New material' : 'Edit material'}
        </Typography>

        <Stack spacing={2} sx={{ flex: 1, overflow: 'auto', pb: 2 }}>
          <FormTextField name="name" control={control} label="Name" required />
          <FormTextField
            name="category"
            control={control}
            label="Category"
            helperText="Lowercase alphanumeric, _ or -"
            required
          />
          <FormTextField
            name="specification"
            control={control}
            label="Specification"
            multiline
            minRows={2}
          />
          <FormTextField name="brand" control={control} label="Brand" />

          <FormSelect
            name="baseUnit"
            control={control}
            label="Base unit"
            options={unitOptions}
            disabled={baseUnitLocked}
          />
          {baseUnitLocked ? (
            <FormHelperText>
              Base unit is locked after stock ledger transactions.
            </FormHelperText>
          ) : null}

          <Controller
            name="alternateUnits"
            control={control}
            render={({ field, fieldState }) => (
              <FormControl error={Boolean(fieldState.error)}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Alternate units
                </Typography>
                <Stack>
                  {alternateChoices.map((opt) => {
                    const checked = (field.value ?? []).includes(
                      opt.value as MaterialUnit,
                    );
                    return (
                      <FormControlLabel
                        key={opt.value}
                        control={
                          <Checkbox
                            checked={checked}
                            onChange={(_, isChecked) => {
                              const current = field.value ?? [];
                              const next = isChecked
                                ? [...current, opt.value as MaterialUnit]
                                : current.filter((u) => u !== opt.value);
                              field.onChange(next);
                            }}
                          />
                        }
                        label={opt.label}
                      />
                    );
                  })}
                </Stack>
                {fieldState.error?.message ? (
                  <FormHelperText>{fieldState.error.message}</FormHelperText>
                ) : null}
              </FormControl>
            )}
          />

          {fields.length > 0 ? (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">
                Conversion factors (1 alternate = factor × base)
              </Typography>
              {fields.map((field, index) => (
                <Box
                  key={field.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 1,
                    alignItems: 'center',
                  }}
                >
                  <Typography sx={{ minWidth: 100 }} variant="body2">
                    {MATERIAL_UNIT_OPTIONS.find((u) => u.value === field.unit)
                      ?.label ?? field.unit}
                  </Typography>
                  <FormTextField
                    name={`conversionFactors.${index}.factorToBase`}
                    control={control}
                    label="Factor to base"
                    type="number"
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  />
                </Box>
              ))}
            </Stack>
          ) : null}

          <Typography variant="subtitle2">Reorder settings</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5 }}>
            <FormTextField
              name="minimumStock"
              control={control}
              label="Minimum"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
            <FormTextField
              name="reorderLevel"
              control={control}
              label="Reorder level"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
            <FormTextField
              name="maximumStock"
              control={control}
              label="Maximum"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
          </Box>

          <FormTextField
            name="standardRate"
            control={control}
            label="Standard rate"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
          />
          <FormTextField
            name="standardWastagePercentage"
            control={control}
            label="Std wastage %"
            type="number"
            slotProps={{ htmlInput: { min: 0, max: 100, step: 'any' } }}
          />

          {canViewAccounts ? (
            <FormSelect
              name="ledgerAccountId"
              control={control}
              label="Ledger account"
              options={ledgerSelectOptions}
            />
          ) : (
            <FormTextField
              name="ledgerAccountId"
              control={control}
              label="Ledger account ID"
              helperText="Requires account.view to browse ledger options"
            />
          )}

          <FormControl fullWidth size="small">
            <InputLabel id="material-status-label">Status</InputLabel>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="material-status-label"
                  label="Status"
                >
                  {MATERIAL_STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>
        </Stack>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 1,
            justifyContent: 'flex-end',
            pt: 2,
          }}
        >
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
