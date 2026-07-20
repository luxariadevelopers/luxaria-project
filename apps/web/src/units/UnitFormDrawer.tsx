import { useEffect } from 'react';
import { Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/client';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { canEditUnitIdentity } from './bookedRestrictions';
import {
  UNIT_FACING_OPTIONS,
  UNIT_TYPE_OPTIONS,
} from './labels';
import { UnitStatus, UnitType, type PublicUnit } from './types';
import { useCreateUnit, useUpdateUnit } from './useUnits';
import {
  assertUniqueUnitInList,
  toCreateUnitInput,
  toUpdateUnitInput,
  unitFormSchema,
  unitUpdateSchema,
  type UnitFormValues,
  type UnitUpdateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  projectId: string;
  unit?: PublicUnit | null;
  existingUnits: readonly PublicUnit[];
};

const EMPTY_CREATE: UnitFormValues = {
  projectId: '',
  block: '',
  floor: '',
  unitNumber: '',
  unitType: UnitType.TwoBhk,
  carpetArea: 0,
  builtUpArea: 0,
  uds: 0,
  facing: '',
  parking: '',
  basePrice: 0,
  additionalCharges: 0,
  tax: 0,
  status: UnitStatus.Available,
  notes: '',
};

const FACING_OPTIONS = [
  { value: '', label: 'None' },
  ...UNIT_FACING_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
  })),
];

const CREATE_STATUS_OPTIONS = [
  { value: UnitStatus.Available, label: 'Available' },
  { value: UnitStatus.Blocked, label: 'Blocked' },
];

const TYPE_OPTIONS = UNIT_TYPE_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

function toUpdateValues(unit: PublicUnit): UnitUpdateFormValues {
  return {
    block: unit.block,
    floor: unit.floor,
    unitNumber: unit.unitNumber,
    unitType: unit.unitType,
    carpetArea: unit.carpetArea,
    builtUpArea: unit.builtUpArea,
    uds: unit.uds,
    facing: unit.facing ?? '',
    parking: unit.parking ?? '',
    basePrice: unit.basePrice,
    additionalCharges: unit.additionalCharges,
    tax: unit.tax,
    notes: unit.notes ?? '',
  };
}

export function UnitFormDrawer({
  open,
  onClose,
  mode,
  projectId,
  unit,
  existingUnits,
}: Props) {
  const create = useCreateUnit();
  const update = useUpdateUnit();
  const { success, error: notifyError } = useNotify();

  const createForm = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: { ...EMPTY_CREATE, projectId },
  });

  const updateForm = useForm<UnitUpdateFormValues>({
    resolver: zodResolver(unitUpdateSchema),
    defaultValues: EMPTY_CREATE,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      createForm.reset({ ...EMPTY_CREATE, projectId });
    } else if (unit) {
      updateForm.reset(toUpdateValues(unit));
    }
  }, [open, mode, projectId, unit, createForm, updateForm]);

  const identityLocked =
    mode === 'edit' && unit ? !canEditUnitIdentity(unit) : false;

  const onSubmitCreate = createForm.handleSubmit(async (values) => {
    const uniq = assertUniqueUnitInList({
      projectId: values.projectId,
      block: values.block,
      unitNumber: values.unitNumber,
      existing: existingUnits,
    });
    if (!uniq.ok) {
      createForm.setError('unitNumber', { message: uniq.message });
      return;
    }
    try {
      await create.mutateAsync(toCreateUnitInput(values));
      success('Unit created');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'Create unit failed'));
    }
  });

  const onSubmitUpdate = updateForm.handleSubmit(async (values) => {
    if (!unit) return;
    const uniq = assertUniqueUnitInList({
      projectId: unit.projectId,
      block: values.block,
      unitNumber: values.unitNumber,
      existing: existingUnits,
      excludeId: unit.id,
    });
    if (!uniq.ok) {
      updateForm.setError('unitNumber', { message: uniq.message });
      return;
    }
    try {
      await update.mutateAsync({
        id: unit.id,
        input: toUpdateUnitInput(values),
      });
      success('Unit updated');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'Update unit failed'));
    }
  });

  const busy = create.isPending || update.isPending;

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Stack
        spacing={2}
        sx={{ width: { xs: 320, sm: 420 }, p: 3 }}
        data-testid="unit-form-drawer"
      >
        <Typography variant="h6">
          {mode === 'create' ? 'New unit' : 'Edit unit'}
        </Typography>

        {mode === 'create' ? (
          <Stack
            component="form"
            spacing={1.5}
            onSubmit={(e) => void onSubmitCreate(e)}
          >
            <FormTextField
              name="block"
              control={createForm.control}
              label="Block"
              required
            />
            <FormTextField
              name="floor"
              control={createForm.control}
              label="Floor"
              required
            />
            <FormTextField
              name="unitNumber"
              control={createForm.control}
              label="Unit number"
              required
            />
            <FormSelect
              name="unitType"
              control={createForm.control}
              label="Unit type"
              options={TYPE_OPTIONS}
            />
            <FormTextField
              name="carpetArea"
              control={createForm.control}
              label="Carpet area"
              type="number"
            />
            <FormTextField
              name="builtUpArea"
              control={createForm.control}
              label="Built-up area"
              type="number"
            />
            <FormTextField
              name="uds"
              control={createForm.control}
              label="UDS"
              type="number"
            />
            <FormSelect
              name="facing"
              control={createForm.control}
              label="Facing"
              options={FACING_OPTIONS}
            />
            <FormTextField
              name="parking"
              control={createForm.control}
              label="Parking"
            />
            <FormTextField
              name="basePrice"
              control={createForm.control}
              label="Base price"
              type="number"
            />
            <FormTextField
              name="additionalCharges"
              control={createForm.control}
              label="Additional charges"
              type="number"
            />
            <FormTextField
              name="tax"
              control={createForm.control}
              label="Tax"
              type="number"
            />
            <FormSelect
              name="status"
              control={createForm.control}
              label="Initial status"
              options={CREATE_STATUS_OPTIONS}
            />
            <FormTextField
              name="notes"
              control={createForm.control}
              label="Notes"
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={busy}>
                Create
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack
            component="form"
            spacing={1.5}
            onSubmit={(e) => void onSubmitUpdate(e)}
          >
            {identityLocked ? (
              <Typography variant="body2" color="warning.main">
                Block / floor / unit number are locked while this unit is
                occupied.
              </Typography>
            ) : null}
            <FormTextField
              name="block"
              control={updateForm.control}
              label="Block"
              required
              disabled={identityLocked}
            />
            <FormTextField
              name="floor"
              control={updateForm.control}
              label="Floor"
              required
              disabled={identityLocked}
            />
            <FormTextField
              name="unitNumber"
              control={updateForm.control}
              label="Unit number"
              required
              disabled={identityLocked}
            />
            <FormSelect
              name="unitType"
              control={updateForm.control}
              label="Unit type"
              options={TYPE_OPTIONS}
            />
            <FormTextField
              name="carpetArea"
              control={updateForm.control}
              label="Carpet area"
              type="number"
            />
            <FormTextField
              name="builtUpArea"
              control={updateForm.control}
              label="Built-up area"
              type="number"
            />
            <FormTextField
              name="uds"
              control={updateForm.control}
              label="UDS"
              type="number"
            />
            <FormSelect
              name="facing"
              control={updateForm.control}
              label="Facing"
              options={FACING_OPTIONS}
            />
            <FormTextField
              name="parking"
              control={updateForm.control}
              label="Parking"
            />
            <FormTextField
              name="basePrice"
              control={updateForm.control}
              label="Base price"
              type="number"
            />
            <FormTextField
              name="additionalCharges"
              control={updateForm.control}
              label="Additional charges"
              type="number"
            />
            <FormTextField
              name="tax"
              control={updateForm.control}
              label="Tax"
              type="number"
            />
            <FormTextField
              name="notes"
              control={updateForm.control}
              label="Notes"
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={busy}>
                Save
              </Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Drawer>
  );
}
