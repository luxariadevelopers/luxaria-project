import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
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
import { BILLING_CYCLE_OPTIONS } from './labels';
import { summarizeBoqItems } from './calculations';
import type { PublicContractorAgreement } from './types';
import {
  useCreateContractorAgreement,
  useUpdateContractorAgreement,
} from './useContractorAgreements';
import {
  agreementFormSchema,
  agreementToFormValues,
  defaultAgreementFormValues,
  formValuesToCreateInput,
  type AgreementFormValues,
} from './validation';

export type AgreementEntryMode = 'create' | 'edit';

type Props = {
  open: boolean;
  onClose: () => void;
  mode: AgreementEntryMode;
  projectId: string;
  agreement: PublicContractorAgreement | null;
  canManage: boolean;
  onSaved?: (row: PublicContractorAgreement) => void;
};

const UNIT_OPTIONS = Object.values(BoqUnit).map((value) => ({
  value,
  label: value.replace(/_/g, ' '),
}));

export function AgreementFormDrawer({
  open,
  onClose,
  mode,
  projectId,
  agreement,
  canManage,
  onSaved,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateContractorAgreement();
  const update = useUpdateContractorAgreement();

  const readOnly = !canManage;

  const { control, handleSubmit, reset, watch } = useForm<AgreementFormValues>({
    resolver: zodResolver(agreementFormSchema),
    defaultValues: defaultAgreementFormValues(projectId),
  });

  const boqFields = useFieldArray({ control, name: 'boqItems' });
  const skillFields = useFieldArray({ control, name: 'skillMix' });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && agreement) {
      reset(agreementToFormValues(agreement));
    } else {
      reset(defaultAgreementFormValues(projectId));
    }
  }, [agreement, mode, open, projectId, reset]);

  const boqItems = watch('boqItems');
  const totals = useMemo(
    () => summarizeBoqItems(boqItems ?? []),
    [boqItems],
  );

  const loadContractors = async (input: string) => {
    const rows = await searchContractors({ search: input, limit: 10 });
    return rows.map((row) => ({
      value: row.id,
      label: [row.contractorCode, row.legalName].filter(Boolean).join(' — '),
    }));
  };

  const onSubmit = async (values: AgreementFormValues) => {
    const input = formValuesToCreateInput({ ...values, projectId });
    try {
      const saved =
        mode === 'edit' && agreement
          ? await update.mutateAsync({ id: agreement.id, input })
          : await create.mutateAsync(input);
      success(
        mode === 'edit' ? 'Agreement updated' : 'Agreement draft created',
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
        paper: { sx: { width: { xs: '100%', sm: 560, md: 720 } } },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ p: 3, height: '100%', overflow: 'auto' }}
        data-testid="agreement-form-drawer"
      >
        <Typography variant="h5" sx={{ mb: 2 }}>
          {mode === 'edit' ? 'Edit agreement draft' : 'New contractor agreement'}
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
            <FormTextField
              name="workScope"
              control={control}
              label="Work scope"
              multiline
              minRows={3}
              disabled={readOnly}
            />
          </FormSection>

          <FormSection title="Scope & rates (BOQ lines)">
            <Alert severity="info" variant="outlined">
              Agreed total preview: {formatInr(totals.agreedRatesTotal)} (
              {totals.agreedQuantity} qty)
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
                  name={`boqItems.${index}.description`}
                  control={control}
                  label="Description"
                  disabled={readOnly}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <FormSelect
                    name={`boqItems.${index}.unit`}
                    control={control}
                    label="Unit"
                    options={UNIT_OPTIONS}
                    disabled={readOnly}
                  />
                  <FormTextField
                    name={`boqItems.${index}.agreedQuantity`}
                    control={control}
                    label="Quantity"
                    type="number"
                    disabled={readOnly}
                  />
                  <FormTextField
                    name={`boqItems.${index}.agreedRate`}
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
                    agreedQuantity: 0,
                    agreedRate: 0,
                  })
                }
              >
                Add BOQ line
              </Button>
            ) : null}
          </FormSection>

          <FormSection title="Manpower">
            <FormTextField
              name="manpowerCommitment"
              control={control}
              label="Manpower commitment"
              type="number"
              disabled={readOnly}
            />
            {skillFields.fields.map((field, index) => (
              <Stack
                key={field.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ alignItems: 'flex-start' }}
              >
                <FormTextField
                  name={`skillMix.${index}.skill`}
                  control={control}
                  label="Skill"
                  disabled={readOnly}
                />
                <FormTextField
                  name={`skillMix.${index}.headcount`}
                  control={control}
                  label="Headcount"
                  type="number"
                  disabled={readOnly}
                />
                {!readOnly ? (
                  <IconButton onClick={() => skillFields.remove(index)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                ) : null}
              </Stack>
            ))}
            {!readOnly ? (
              <Button
                startIcon={<AddIcon />}
                onClick={() => skillFields.append({ skill: '', headcount: 0 })}
              >
                Add skill mix row
              </Button>
            ) : null}
          </FormSection>

          <FormSection title="Commercial terms">
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
            <FormSelect
              name="billingCycle"
              control={control}
              label="Billing cycle"
              options={BILLING_CYCLE_OPTIONS}
              disabled={readOnly}
            />
            <FormTextField
              name="retentionPercentage"
              control={control}
              label="Retention %"
              type="number"
              disabled={readOnly}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormTextField
                name="advanceAmount"
                control={control}
                label="Advance amount"
                type="number"
                disabled={readOnly}
              />
              <FormTextField
                name="advanceTerms"
                control={control}
                label="Advance terms"
                disabled={readOnly}
              />
            </Stack>
            <FormTextField
              name="penalties"
              control={control}
              label="Penalties"
              multiline
              minRows={2}
              disabled={readOnly}
            />
            <FormTextField
              name="safetyTerms"
              control={control}
              label="Safety terms"
              multiline
              minRows={2}
              disabled={readOnly}
            />
            <FormTextField
              name="terminationTerms"
              control={control}
              label="Termination terms"
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
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack
          direction="row"
          spacing={1.5}
          sx={{ justifyContent: 'flex-end' }}
        >
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
      </Box>
    </Drawer>
  );
}
