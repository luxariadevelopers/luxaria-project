import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { formDrawerPaperSx } from '@/components/forms';
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useFieldArray, useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { searchContractors } from '@/api/searchLists';
import { BoqUnit } from '@/boq/types';
import { AsyncSelect } from '@/components/forms/AsyncSelect';
import { DateInput } from '@/components/forms/DateInput';
import { FormSection } from '@/components/forms/FormSection';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { RESPONSIBILITY_OPTIONS } from './labels';
import type { PublicWorkOrder } from './types';
import {
  useCreateWorkOrder,
  useUpdateWorkOrder,
} from './useWorkOrders';
import {
  defaultWorkOrderFormValues,
  formValuesToCreateInput,
  formValuesToUpdateInput,
  summarizeBoqLines,
  workOrderFormSchema,
  workOrderToFormValues,
  type WorkOrderFormValues,
} from './validation';

export type WorkOrderEntryMode = 'create' | 'edit';

type Props = {
  open: boolean;
  onClose: () => void;
  mode: WorkOrderEntryMode;
  projectId: string;
  workOrder: PublicWorkOrder | null;
  canCreate: boolean;
  onSaved?: (row: PublicWorkOrder) => void;
};

const UNIT_OPTIONS = Object.values(BoqUnit).map((value) => ({
  value,
  label: value.replace(/_/g, ' '),
}));

export function WorkOrderFormDrawer({
  open,
  onClose,
  mode,
  projectId,
  workOrder,
  canCreate,
  onSaved,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateWorkOrder();
  const update = useUpdateWorkOrder();
  const readOnly = !canCreate;

  const { control, handleSubmit, reset, watch } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: defaultWorkOrderFormValues(projectId),
  });

  const boqFields = useFieldArray({ control, name: 'boqScopeLines' });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && workOrder) {
      reset(workOrderToFormValues(workOrder));
    } else {
      reset(defaultWorkOrderFormValues(projectId));
    }
  }, [mode, open, projectId, reset, workOrder]);

  const lines = watch('boqScopeLines');
  const totals = useMemo(() => summarizeBoqLines(lines ?? []), [lines]);

  const loadContractors = async (input: string) => {
    const rows = await searchContractors({ search: input, limit: 10 });
    return rows.map((row) => ({
      value: row.id,
      label: [row.contractorCode, row.legalName].filter(Boolean).join(' — '),
    }));
  };

  const onSubmit = async (values: WorkOrderFormValues) => {
    try {
      const saved =
        mode === 'edit' && workOrder
          ? await update.mutateAsync({
              id: workOrder.id,
              input: formValuesToUpdateInput(values),
            })
          : await create.mutateAsync(
              formValuesToCreateInput({ ...values, projectId }),
            );
      success(
        mode === 'edit' ? 'Work order draft updated' : 'Work order draft created',
      );
      onSaved?.(saved);
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
        paper: { sx: formDrawerPaperSx({ sm: 560, md: 720 }) },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ p: 3, height: '100%', overflow: 'auto' }}
        data-testid="work-order-form-drawer"
      >
        <Typography variant="h5" sx={{ mb: 2 }}>
          {mode === 'edit' ? 'Edit work order draft' : 'New work order'}
        </Typography>

        <Stack spacing={3}>
          <FormSection title="Parties">
            <AsyncSelect
              name="contractorId"
              control={control}
              label="Contractor"
              loadOptions={loadContractors}
              disabled={readOnly || mode === 'edit'}
              required
            />
          </FormSection>

          <FormSection title="BOQ scope">
            <Alert severity="info" variant="outlined">
              Contract value preview: {formatInr(totals.value)} (
              {totals.quantity} qty)
            </Alert>
            {boqFields.fields.map((field, index) => (
              <Stack
                key={field.id}
                spacing={1.5}
                sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}
              >
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between' }}
                >
                  <Typography variant="subtitle2">Line {index + 1}</Typography>
                  {!readOnly && boqFields.fields.length > 1 ? (
                    <IconButton
                      size="small"
                      onClick={() => boqFields.remove(index)}
                      aria-label="Remove line"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Stack>
                <FormTextField
                  name={`boqScopeLines.${index}.description`}
                  control={control}
                  label="Description"
                  disabled={readOnly}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <FormSelect
                    name={`boqScopeLines.${index}.unit`}
                    control={control}
                    label="Unit"
                    options={UNIT_OPTIONS}
                    disabled={readOnly}
                  />
                  <FormTextField
                    name={`boqScopeLines.${index}.quantity`}
                    control={control}
                    label="Quantity"
                    type="number"
                    disabled={readOnly}
                  />
                  <FormTextField
                    name={`boqScopeLines.${index}.rate`}
                    control={control}
                    label="Rate"
                    type="number"
                    disabled={readOnly}
                  />
                </Stack>
              </Stack>
            ))}
            {!readOnly ? (
              <Button
                startIcon={<AddIcon />}
                onClick={() =>
                  boqFields.append({
                    boqItemId: null,
                    boqCode: '',
                    description: '',
                    unit: BoqUnit.Number,
                    quantity: 0,
                    rate: 0,
                  })
                }
              >
                Add BOQ line
              </Button>
            ) : null}
          </FormSection>

          <FormSection title="Schedule & responsibility">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <DateInput
                name="startDate"
                control={control}
                label="Start date"
                disabled={readOnly}
              />
              <DateInput
                name="endDate"
                control={control}
                label="End date"
                disabled={readOnly}
              />
            </Stack>
            <FormTextField
              name="locations"
              control={control}
              label="Locations (comma-separated)"
              disabled={readOnly}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormSelect
                name="materialResponsibility"
                control={control}
                label="Material responsibility"
                options={RESPONSIBILITY_OPTIONS}
                disabled={readOnly}
              />
              <FormSelect
                name="labourResponsibility"
                control={control}
                label="Labour responsibility"
                options={RESPONSIBILITY_OPTIONS}
                disabled={readOnly}
              />
            </Stack>
            <FormTextField
              name="terms"
              control={control}
              label="Terms"
              multiline
              minRows={2}
              disabled={readOnly}
            />
            <FormTextField
              name="notes"
              control={control}
              label="Notes"
              multiline
              minRows={2}
              disabled={readOnly}
            />
          </FormSection>

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Cancel</Button>
            {!readOnly ? (
              <Button
                type="submit"
                variant="contained"
                disabled={create.isPending || update.isPending}
              >
                {mode === 'edit' ? 'Save draft' : 'Create draft'}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
