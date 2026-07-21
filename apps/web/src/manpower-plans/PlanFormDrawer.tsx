import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useLabourCategoriesList } from '@/labour-categories/useLabourCategories';
import { SkillMixEditor } from './SkillMixEditor';
import type { PublicManpowerDailyPlan } from './types';
import {
  useCreateManpowerPlan,
  useUpdateManpowerPlan,
} from './useManpowerPlans';
import {
  defaultManpowerPlanFormValues,
  manpowerPlanFormSchema,
  planToFormValues,
  shapeCreatePayload,
  shapeUpdatePayload,
  type ManpowerPlanFormValues,
} from './validation';

type ContractorOption = {
  id: string;
  label: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  contractors: readonly ContractorOption[];
  plan?: PublicManpowerDailyPlan | null;
  onCreated?: (plan: PublicManpowerDailyPlan) => void;
};

export function PlanFormDrawer({
  open,
  onClose,
  projectId,
  contractors,
  plan,
  onCreated,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateManpowerPlan();
  const update = useUpdateManpowerPlan();
  const isEdit = Boolean(plan);

  const categories = useLabourCategoriesList(
    { page: 1, limit: 200 },
    open,
  );

  const form = useForm<ManpowerPlanFormValues>({
    resolver: zodResolver(manpowerPlanFormSchema),
    defaultValues: defaultManpowerPlanFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    if (plan) {
      form.reset(planToFormValues(plan));
    } else {
      form.reset(defaultManpowerPlanFormValues());
    }
  }, [open, plan, form]);

  const useAgreementDefaults = useWatch({
    control: form.control,
    name: 'useAgreementDefaults',
  });

  const busy = create.isPending || update.isPending;

  const onSubmit = form.handleSubmit((values) => {
    void (async () => {
      try {
        if (isEdit && plan) {
          await update.mutateAsync({
            id: plan.id,
            input: shapeUpdatePayload(values),
          });
          success('Manpower plan updated');
        } else {
          const created = await create.mutateAsync(
            shapeCreatePayload(projectId, values),
          );
          success('Manpower plan created');
          onCreated?.(created);
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
        sx={{ width: { xs: 320, sm: 480 }, p: 2.5 }}
        component="form"
        onSubmit={onSubmit}
        data-testid="manpower-plan-form-drawer"
      >
        <Typography variant="h6">
          {isEdit ? 'Edit manpower plan' : 'Create manpower plan'}
        </Typography>

        <Controller
          control={form.control}
          name="contractorId"
          render={({ field, fieldState }) => (
            <FormControl
              size="small"
              fullWidth
              error={Boolean(fieldState.error)}
              disabled={isEdit || busy}
            >
              <InputLabel id="plan-contractor-label">Contractor</InputLabel>
              <Select
                labelId="plan-contractor-label"
                label="Contractor"
                value={field.value}
                onChange={field.onChange}
              >
                {contractors.map((row) => (
                  <MenuItem key={row.id} value={row.id}>
                    {row.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />

        <TextField
          size="small"
          type="date"
          label="Plan date"
          slotProps={{ inputLabel: { shrink: true } }}
          disabled={busy}
          error={Boolean(form.formState.errors.planDate)}
          helperText={form.formState.errors.planDate?.message}
          {...form.register('planDate')}
        />

        <Controller
          control={form.control}
          name="useAgreementDefaults"
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={busy}
                />
              }
              label="Use agreement defaults"
            />
          )}
        />

        {!useAgreementDefaults ? (
          <TextField
            size="small"
            type="number"
            label="Total planned headcount (optional)"
            disabled={busy}
            {...form.register('plannedHeadcount', { valueAsNumber: true })}
            helperText="Defaults to sum of skill lines when omitted"
          />
        ) : null}

        <SkillMixEditor
          control={form.control}
          register={form.register}
          useAgreementDefaults={Boolean(useAgreementDefaults)}
          categories={categories.data?.items ?? []}
          disabled={busy}
        />

        <TextField
          size="small"
          label="Notes"
          multiline
          minRows={2}
          disabled={busy}
          {...form.register('notes')}
        />

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {isEdit ? 'Save changes' : 'Create plan'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
