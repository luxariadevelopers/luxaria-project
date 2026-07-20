import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Drawer,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicLabourCategory, PublicLabourCategoryRate } from './types';
import {
  useCreateLabourCategoryRate,
  useUpdateLabourCategoryRate,
} from './useLabourCategories';
import {
  defaultRateFormValues,
  labourCategoryRateFormSchema,
  toOptionalId,
  type LabourCategoryRateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  category: PublicLabourCategory;
  rate?: PublicLabourCategoryRate | null;
};

export function RateFormDrawer({ open, onClose, category, rate }: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateLabourCategoryRate();
  const update = useUpdateLabourCategoryRate();
  const isEdit = Boolean(rate);

  const form = useForm<LabourCategoryRateFormValues>({
    resolver: zodResolver(labourCategoryRateFormSchema),
    defaultValues: defaultRateFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    if (rate) {
      form.reset({
        projectId: rate.projectId ?? '',
        contractorId: rate.contractorId ?? '',
        dailyRate: rate.dailyRate,
        overtimeRate: rate.overtimeRate,
        effectiveDate: rate.effectiveDate.slice(0, 10),
        notes: rate.notes ?? '',
      });
    } else {
      form.reset(defaultRateFormValues());
    }
  }, [open, rate, form]);

  const busy = create.isPending || update.isPending;

  const onSubmit = form.handleSubmit((values) => {
    void (async () => {
      try {
        if (isEdit && rate) {
          await update.mutateAsync({
            rateId: rate.id,
            input: {
              dailyRate: values.dailyRate,
              overtimeRate: values.overtimeRate,
              effectiveDate: values.effectiveDate,
              notes: values.notes?.trim() || null,
            },
          });
          success('Rate override updated');
        } else {
          await create.mutateAsync({
            categoryId: category.id,
            input: {
              projectId: toOptionalId(values.projectId),
              contractorId: toOptionalId(values.contractorId),
              dailyRate: values.dailyRate,
              overtimeRate: values.overtimeRate,
              effectiveDate: values.effectiveDate,
              notes: values.notes?.trim() || null,
            },
          });
          success('Rate override created');
        }
        onClose();
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  });

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Stack
        spacing={2}
        sx={{ width: { xs: 320, sm: 420 }, p: 2.5 }}
        component="form"
        onSubmit={onSubmit}
        data-testid="labour-rate-form-drawer"
      >
        <Typography variant="h6">
          {isEdit ? 'Edit rate override' : 'Add rate override'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {category.name} ({category.categoryCode})
        </Typography>

        <TextField
          label="Project ID"
          disabled={isEdit}
          {...form.register('projectId')}
          error={Boolean(form.formState.errors.projectId)}
          helperText={
            form.formState.errors.projectId?.message ||
            'Optional if contractor is set'
          }
        />
        <TextField
          label="Contractor ID"
          disabled={isEdit}
          {...form.register('contractorId')}
          error={Boolean(form.formState.errors.contractorId)}
          helperText={
            form.formState.errors.contractorId?.message ||
            'Optional if project is set'
          }
        />
        <TextField
          label="Daily rate"
          type="number"
          required
          inputProps={{ min: 0, step: '0.01' }}
          {...form.register('dailyRate')}
          error={Boolean(form.formState.errors.dailyRate)}
          helperText={form.formState.errors.dailyRate?.message}
        />
        <TextField
          label="Overtime rate"
          type="number"
          required
          inputProps={{ min: 0, step: '0.01' }}
          {...form.register('overtimeRate')}
          error={Boolean(form.formState.errors.overtimeRate)}
          helperText={form.formState.errors.overtimeRate?.message}
        />
        <TextField
          label="Effective date"
          type="date"
          required
          InputLabelProps={{ shrink: true }}
          {...form.register('effectiveDate')}
          error={Boolean(form.formState.errors.effectiveDate)}
          helperText={form.formState.errors.effectiveDate?.message}
        />
        <TextField
          label="Notes"
          multiline
          minRows={2}
          {...form.register('notes')}
        />

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
