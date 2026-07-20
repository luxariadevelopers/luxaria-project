import { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormSelect, FormTextField } from '@/components/forms';
import { BOQ_UNIT_OPTIONS } from './labels';
import type { PublicMaterialCoefficient } from './types';
import {
  coefficientFormSchema,
  defaultCoefficientFormValues,
  effectiveQuantityPerUnit,
  shapeCoefficientCreatePayload,
  validateCreateAgainstExisting,
  type CoefficientFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId?: string | null;
  existing: ReadonlyArray<PublicMaterialCoefficient>;
  editing?: PublicMaterialCoefficient | null;
  onSubmit: (values: CoefficientFormValues) => Promise<void>;
  submitting?: boolean;
};

export function MaterialCoefficientForm({
  open,
  onClose,
  projectId,
  existing,
  editing,
  onSubmit,
  submitting = false,
}: Props) {
  const { control, handleSubmit, reset, watch } = useForm<CoefficientFormValues>({
    resolver: zodResolver(coefficientFormSchema),
    defaultValues: defaultCoefficientFormValues(projectId),
  });

  const quantityPerUnit = watch('quantityPerUnit');
  const wastagePercentage = watch('wastagePercentage');
  const scopeMode = watch('scopeMode');
  const linkType = watch('linkType');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        scopeMode: editing.isProjectOverride ? 'project' : 'global',
        projectId: editing.projectId,
        linkType: editing.boqItemId ? 'boqItem' : 'workType',
        boqItemId: editing.boqItemId,
        workType: editing.workType ?? '',
        outputUnit: editing.outputUnit,
        materialId: editing.materialId,
        quantityPerUnit: editing.quantityPerUnit,
        wastagePercentage: editing.wastagePercentage,
        effectiveDate: String(editing.effectiveDate).slice(0, 10),
        notes: editing.notes ?? '',
        overridesStandardId: editing.overridesStandardId,
      });
    } else {
      reset(defaultCoefficientFormValues(projectId));
    }
  }, [open, editing, projectId, reset]);

  const previewEffective = effectiveQuantityPerUnit(
    Number(quantityPerUnit) || 0,
    Number(wastagePercentage) || 0,
  );

  const handleFormSubmit = handleSubmit(async (values) => {
    if (!editing) {
      const check = validateCreateAgainstExisting(values, existing);
      if (!check.ok) {
        throw new Error(check.message);
      }
    }
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {editing ? 'Edit consumption standard' : 'New consumption standard'}
      </DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
          component="form"
          id="material-coefficient-form"
          onSubmit={handleFormSubmit}
        >
          <Typography variant="body2" color="text.secondary">
            Define standard material consumption per output unit. Project overrides
            take precedence over company-wide norms when resolving consumption.
          </Typography>

          {!editing && (
            <FormSelect
              name="scopeMode"
              control={control}
              label="Scope"
              options={[
                { value: 'global', label: 'Company-wide' },
                { value: 'project', label: 'Project override' },
              ]}
              disabled={!projectId && scopeMode === 'project'}
            />
          )}

          {scopeMode === 'project' && !editing && (
            <Alert severity="info" variant="outlined">
              Project override for {projectId ?? 'selected project'}. Links to
              the active company standard when one exists.
            </Alert>
          )}

          <FormSelect
            name="linkType"
            control={control}
            label="Applies to"
            options={[
              { value: 'workType', label: 'Work type' },
              { value: 'boqItem', label: 'BOQ item' },
            ]}
          />

          {linkType === 'workType' ? (
            <FormTextField
              name="workType"
              control={control}
              label="Work type"
              placeholder="e.g. Brick masonry"
              required
            />
          ) : (
            <FormTextField
              name="boqItemId"
              control={control}
              label="BOQ item id"
              helperText="MongoDB id of the BOQ item"
              required
            />
          )}

          <FormSelect
            name="outputUnit"
            control={control}
            label="Output unit"
            options={BOQ_UNIT_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />

          <FormTextField
            name="materialId"
            control={control}
            label="Material id"
            helperText="Active material from material master"
            required
            disabled={Boolean(editing)}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField
              name="quantityPerUnit"
              control={control}
              label="Standard consumption / unit"
              type="number"
              required
            />
            <FormTextField
              name="wastagePercentage"
              control={control}
              label="Allowed wastage %"
              type="number"
              required
            />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Effective qty (with wastage):{' '}
            <strong>{previewEffective > 0 ? previewEffective : '—'}</strong>
          </Typography>

          <FormTextField
            name="effectiveDate"
            control={control}
            label="Effective date"
            type="date"
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <FormTextField
            name="notes"
            control={control}
            label="Notes"
            multiline
            minRows={2}
          />

          {!editing && scopeMode === 'project' && (
            <FormTextField
              name="overridesStandardId"
              control={control}
              label="Overrides standard id (optional)"
              helperText="Link to company-wide standard; auto-linked when active global exists"
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="material-coefficient-form"
          variant="contained"
          disabled={submitting}
        >
          {editing ? 'Save' : 'Create draft'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export { shapeCoefficientCreatePayload };
