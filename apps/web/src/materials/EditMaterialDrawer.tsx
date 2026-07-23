import { useEffect } from 'react';
import { formDrawerPaperSx } from '@/components/forms';
import {
  Alert,
  Box,
  Button,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { MATERIAL_STATUS_OPTIONS, MATERIAL_UNIT_OPTIONS, materialUnitLabel } from './labels';
import type { PublicMaterial } from './types';
import { useUpdateMaterial } from './useMaterials';
import {
  buildMaterialUpdatePayload,
  isBaseUnitReadOnly,
  materialUpdateSchema,
  type MaterialUpdateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  material: PublicMaterial;
};

const STATUS_OPTIONS = MATERIAL_STATUS_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

const UNIT_OPTIONS = MATERIAL_UNIT_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label ?? materialUnitLabel(opt.value),
}));

export function EditMaterialDrawer({ open, onClose, material }: Props) {
  const update = useUpdateMaterial();
  const { success, error: notifyError } = useNotify();
  const baseUnitLocked = isBaseUnitReadOnly(material.baseUnitLocked);

  const { control, handleSubmit, reset } = useForm<MaterialUpdateFormValues>({
    resolver: zodResolver(materialUpdateSchema),
    defaultValues: {
      name: material.name,
      category: material.category,
      specification: material.specification ?? '',
      brand: material.brand ?? '',
      baseUnit: material.baseUnit,
      standardRate: material.standardRate,
      minimumStock: material.minimumStock,
      reorderLevel: material.reorderLevel,
      maximumStock: material.maximumStock,
      standardWastagePercentage: material.standardWastagePercentage,
      ledgerAccountId: material.ledgerAccountId,
      status: material.status,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: material.name,
        category: material.category,
        specification: material.specification ?? '',
        brand: material.brand ?? '',
        baseUnit: material.baseUnit,
        standardRate: material.standardRate,
        minimumStock: material.minimumStock,
        reorderLevel: material.reorderLevel,
        maximumStock: material.maximumStock,
        standardWastagePercentage: material.standardWastagePercentage,
        ledgerAccountId: material.ledgerAccountId,
        status: material.status,
      });
    }
  }, [open, material, reset]);

  const onSubmit = async (values: MaterialUpdateFormValues) => {
    const built = buildMaterialUpdatePayload(values, {
      currentBaseUnit: material.baseUnit,
      baseUnitLocked,
    });
    if (!built.ok) {
      notifyError(built.message);
      return;
    }
    try {
      await update.mutateAsync({ id: material.id, input: built.input });
      success('Material updated');
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
        paper: { sx: formDrawerPaperSx(440) },
      }}
    >
      <Box
        component="form"
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        sx={{ p: 3 }}
        data-testid="edit-material-drawer"
      >
        <Stack spacing={2.5}>
          <Typography variant="h6">Edit material</Typography>
          <Typography variant="body2" color="text.secondary">
            {material.materialCode}
          </Typography>

          {baseUnitLocked ? (
            <Alert severity="info" data-testid="base-unit-locked-alert">
              Base unit is read-only because stock transactions exist for this
              material.
            </Alert>
          ) : null}

          <FormTextField name="name" control={control} label="Name" />
          <FormTextField name="category" control={control} label="Category" />
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
            options={UNIT_OPTIONS}
            disabled={baseUnitLocked}
            inputProps={{ 'data-testid': 'material-base-unit-field' }}
          />
          <FormTextField
            name="standardRate"
            control={control}
            label="Standard rate"
            type="number"
          />
          <FormTextField
            name="minimumStock"
            control={control}
            label="Minimum stock"
            type="number"
          />
          <FormTextField
            name="reorderLevel"
            control={control}
            label="Reorder level"
            type="number"
          />
          <FormTextField
            name="maximumStock"
            control={control}
            label="Maximum stock"
            type="number"
          />
          <FormTextField
            name="standardWastagePercentage"
            control={control}
            label="Standard wastage %"
            type="number"
          />
          <FormTextField
            name="ledgerAccountId"
            control={control}
            label="Ledger account id"
          />
          <FormSelect
            name="status"
            control={control}
            label="Status"
            options={STATUS_OPTIONS}
          />

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={update.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={update.isPending}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
