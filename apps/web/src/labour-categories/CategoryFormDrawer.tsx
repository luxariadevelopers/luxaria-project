import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { labourSkillLevelLabel } from './labels';
import {
  LabourSkillLevel,
  type PublicLabourCategory,
} from './types';
import {
  useCreateLabourCategory,
  useUpdateLabourCategory,
} from './useLabourCategories';
import {
  defaultCategoryFormValues,
  labourCategoryFormSchema,
  type LabourCategoryFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  category?: PublicLabourCategory | null;
};

const SKILL_OPTIONS = Object.values(LabourSkillLevel);

export function CategoryFormDrawer({ open, onClose, category }: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateLabourCategory();
  const update = useUpdateLabourCategory();
  const isEdit = Boolean(category);

  const form = useForm<LabourCategoryFormValues>({
    resolver: zodResolver(labourCategoryFormSchema),
    defaultValues: defaultCategoryFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    if (category) {
      form.reset({
        name: category.name,
        skillLevel: category.skillLevel,
        defaultDailyRate: category.defaultDailyRate,
        overtimeRate: category.overtimeRate,
        notes: category.notes ?? '',
      });
    } else {
      form.reset(defaultCategoryFormValues());
    }
  }, [open, category, form]);

  const busy = create.isPending || update.isPending;

  const onSubmit = form.handleSubmit((values) => {
    void (async () => {
      try {
        const payload = {
          name: values.name.trim(),
          skillLevel: values.skillLevel,
          defaultDailyRate: values.defaultDailyRate,
          overtimeRate: values.overtimeRate,
          notes: values.notes?.trim() || null,
        };
        if (isEdit && category) {
          await update.mutateAsync({ id: category.id, input: payload });
          success('Labour category updated');
        } else {
          await create.mutateAsync(payload);
          success('Labour category created');
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
        data-testid="labour-category-form-drawer"
      >
        <Typography variant="h6">
          {isEdit ? 'Edit labour category' : 'New labour category'}
        </Typography>
        {isEdit && category ? (
          <Typography variant="body2" color="text.secondary">
            {category.categoryCode}
          </Typography>
        ) : null}

        <TextField
          label="Name"
          required
          {...form.register('name')}
          error={Boolean(form.formState.errors.name)}
          helperText={form.formState.errors.name?.message}
        />

        <Controller
          name="skillLevel"
          control={form.control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel id="labour-skill-level">Skill level</InputLabel>
              <Select
                labelId="labour-skill-level"
                label="Skill level"
                value={field.value}
                onChange={field.onChange}
              >
                {SKILL_OPTIONS.map((level) => (
                  <MenuItem key={level} value={level}>
                    {labourSkillLevelLabel(level)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />

        <TextField
          label="Default daily rate"
          type="number"
          required
          slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
          {...form.register('defaultDailyRate')}
          error={Boolean(form.formState.errors.defaultDailyRate)}
          helperText={form.formState.errors.defaultDailyRate?.message}
        />
        <TextField
          label="Overtime rate"
          type="number"
          required
          slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
          {...form.register('overtimeRate')}
          error={Boolean(form.formState.errors.overtimeRate)}
          helperText={form.formState.errors.overtimeRate?.message}
        />
        <TextField
          label="Notes"
          multiline
          minRows={2}
          {...form.register('notes')}
        />

        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: 'flex-end' }}
        >
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
