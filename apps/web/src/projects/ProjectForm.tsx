import { useEffect, useMemo } from 'react';
import {
  Alert,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { toAppError } from '@/api/errors';
import { FieldErrorSummary } from '@/components/errors';
import { DateInput } from '@/components/forms/DateInput';
import { FormSection } from '@/components/forms/FormSection';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { formatInrInWords } from '@/format';
import { CapitalPlanFormSection } from './CapitalPlanFormSection';
import type {
  CapitalDirectorRow,
  CapitalInvestorRow,
} from './capitalPlan';
import {
  PROJECT_STAGE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  projectTypeSelectOptions,
} from './constants';
import { ProjectStatus } from './types';
import type {
  ProjectBankOption,
  ProjectCompany,
  ProjectUserOption,
  PublicProject,
} from './types';
import {
  buildProjectFormDefaults,
  projectFormSchema,
  resolveProjectFormField,
  type ProjectFormValues,
} from './validation';

type Props = {
  mode: 'create' | 'edit';
  initial?: PublicProject | null;
  /** Prefill capital plan rows (edit mode). */
  capitalPlanDefaults?: {
    equalDirectorInvestment?: boolean;
    capitalDirectors?: CapitalDirectorRow[];
    capitalInvestors?: CapitalInvestorRow[];
  } | null;
  company: Pick<ProjectCompany, 'id' | 'legalName' | 'companyCode'>;
  userOptions?: readonly ProjectUserOption[];
  bankOptions?: readonly ProjectBankOption[];
  allowTerminalStatus?: boolean;
  submitting?: boolean;
  serverError?: unknown;
  onSubmit: (values: ProjectFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

const numberInputProps = {
  inputMode: 'decimal' as const,
  min: 0,
};

export function ProjectForm({
  mode,
  initial,
  capitalPlanDefaults,
  company,
  userOptions,
  bankOptions,
  allowTerminalStatus = false,
  submitting = false,
  serverError,
  onSubmit,
  onCancel,
}: Props) {
  const defaults = useMemo(() => {
    const base = buildProjectFormDefaults(initial);
    if (!capitalPlanDefaults) return base;
    return {
      ...base,
      equalDirectorInvestment:
        capitalPlanDefaults.equalDirectorInvestment ??
        base.equalDirectorInvestment,
      capitalDirectors:
        capitalPlanDefaults.capitalDirectors ?? base.capitalDirectors,
      capitalInvestors:
        capitalPlanDefaults.capitalInvestors ?? base.capitalInvestors,
    };
  }, [initial, capitalPlanDefaults]);
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaults,
  });
  const { control, handleSubmit, reset, setError, watch } = form;

  const approvedBudget = watch('approvedBudget');
  const approvedBudgetInWords = useMemo(() => {
    const raw = String(approvedBudget ?? '').trim();
    if (!raw) return '';
    return formatInrInWords(raw, { empty: '' });
  }, [approvedBudget]);

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const appError = useMemo(
    () =>
      serverError
        ? toAppError(serverError, 'Unable to save project')
        : null,
    [serverError],
  );

  useEffect(() => {
    if (!appError) return;
    for (const [field, message] of Object.entries(appError.fieldErrors)) {
      const path = resolveProjectFormField(field);
      if (path) {
        setError(path, { type: 'server', message });
      }
    }
  }, [appError, setError]);

  const userSelectOptions = useMemo(
    () => [
      { value: '', label: 'Not assigned' },
      ...(userOptions ?? []).map((user) => ({
        value: user.id,
        label: `${user.fullName} · ${user.userCode}`,
      })),
    ],
    [userOptions],
  );

  const bankSelectOptions = useMemo(
    () => [
      { value: '', label: 'Not assigned' },
      ...(initial?.defaultBankAccount &&
      !(bankOptions ?? []).some(
        (bank) => bank.id === initial.defaultBankAccount,
      )
        ? [
            {
              value: initial.defaultBankAccount,
              label: `Current bank · ${initial.defaultBankAccount}`,
            },
          ]
        : []),
      ...(bankOptions ?? []).map((bank) => ({
        value: bank.id,
        label: `${bank.bankName} · ${bank.maskedAccountNumber}`,
      })),
    ],
    [bankOptions, initial?.defaultBankAccount],
  );
  const createStatusOptions = useMemo(
    () =>
      allowTerminalStatus
        ? PROJECT_STATUS_OPTIONS
        : PROJECT_STATUS_OPTIONS.filter(
            (option) =>
              option.value !== ProjectStatus.Closed &&
              option.value !== ProjectStatus.Archived &&
              option.value !== ProjectStatus.Cancelled,
          ),
    [allowTerminalStatus],
  );

  return (
    <FormProvider {...form}>
    <Stack
      component="form"
      spacing={2.5}
      data-testid="project-form"
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      {appError ? (
        <Alert severity="error">
          {appError.message}
          <FieldErrorSummary error={appError} />
        </Alert>
      ) : null}

      <FormSection
        title="Project identity"
        description="The project code is generated by the server after creation."
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="projectName"
            control={control}
            label="Project name"
            required
          />
          <FormSelect
            name="projectType"
            control={control}
            label="Project type"
            options={projectTypeSelectOptions(initial?.projectType)}
            required
          />
        </Stack>
        <FormTextField
          name="description"
          control={control}
          label="Description"
          multiline
          minRows={3}
        />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="currency"
            control={control}
            label="Currency"
            slotProps={{ htmlInput: { maxLength: 8 } }}
          />
          <FormTextField
            name="timeZone"
            control={control}
            label="Time zone"
          />
        </Stack>
        <TextField
          label="Company"
          value={`${company.legalName} · ${company.companyCode}`}
          disabled
          fullWidth
          helperText="Company is fixed from your authenticated tenant."
        />
      </FormSection>

      <FormSection title="Address">
        <FormTextField
          name="address.line1"
          control={control}
          label="Address line 1"
          required
        />
        <FormTextField
          name="address.line2"
          control={control}
          label="Address line 2"
        />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="address.city"
            control={control}
            label="City"
            required
          />
          <FormTextField
            name="address.state"
            control={control}
            label="State"
            required
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="address.pincode"
            control={control}
            label="PIN code"
            required
            slotProps={{
              htmlInput: { inputMode: 'numeric', maxLength: 6 },
            }}
          />
          <FormTextField
            name="address.country"
            control={control}
            label="Country"
            required
          />
        </Stack>
      </FormSection>

      <FormSection
        title="Site and scale"
        description="Coordinates must be supplied as a latitude/longitude pair."
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="latitude"
            control={control}
            label="Latitude"
            type="number"
            slotProps={{
              htmlInput: { step: 'any', min: -90, max: 90 },
            }}
          />
          <FormTextField
            name="longitude"
            control={control}
            label="Longitude"
            type="number"
            slotProps={{
              htmlInput: { step: 'any', min: -180, max: 180 },
            }}
          />
          <FormTextField
            name="siteRadiusMeters"
            control={control}
            label="Site radius (m)"
            type="number"
            slotProps={{ htmlInput: numberInputProps }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="landArea"
            control={control}
            label="Land area (sq.ft)"
            type="number"
            slotProps={{ htmlInput: numberInputProps }}
          />
          <FormTextField
            name="builtUpArea"
            control={control}
            label="Built-up area (sq.ft)"
            type="number"
            slotProps={{ htmlInput: numberInputProps }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="numberOfBlocks"
            control={control}
            label="Number of blocks"
            type="number"
            slotProps={{ htmlInput: { ...numberInputProps, step: 1 } }}
          />
          <FormTextField
            name="numberOfUnits"
            control={control}
            label="Number of units"
            type="number"
            slotProps={{ htmlInput: { ...numberInputProps, step: 1 } }}
          />
        </Stack>
      </FormSection>

      <FormSection title="Schedule">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <DateInput name="startDate" control={control} label="Start date" />
          <DateInput
            name="expectedCompletionDate"
            control={control}
            label="Expected completion"
          />
          {mode === 'edit' ? (
            <DateInput
              name="actualCompletionDate"
              control={control}
              label="Actual completion"
            />
          ) : null}
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormSelect
            name="projectStage"
            control={control}
            label="Project stage"
            options={PROJECT_STAGE_OPTIONS}
          />
          {mode === 'create' ? (
            <FormSelect
              name="status"
              control={control}
              label="Initial status"
              options={createStatusOptions}
            />
          ) : null}
        </Stack>
      </FormSection>

      <FormSection
        title="Approved budget"
        description="Optional project budget in INR. Shown on the project summary once saved."
      >
        <Stack spacing={0.5} sx={{ maxWidth: { md: 420 } }}>
          <FormTextField
            name="approvedBudget"
            control={control}
            label="Approved budget (₹)"
            type="number"
            helperText="Leave blank if not yet approved"
            slotProps={{
              htmlInput: {
                ...numberInputProps,
                'data-testid': 'approved-budget-input',
              },
            }}
          />
          {approvedBudgetInWords ? (
            <Typography
              variant="caption"
              color="text.secondary"
              data-testid="approved-budget-in-words"
            >
              {approvedBudgetInWords}
            </Typography>
          ) : null}
        </Stack>
        {bankOptions !== undefined ? (
          <FormSelect
            name="defaultBankAccount"
            control={control}
            label="Default bank account"
            options={bankSelectOptions}
          />
        ) : null}
      </FormSection>

      <CapitalPlanFormSection />

      {mode === 'create' && userOptions !== undefined ? (
        <FormSection
          title="Initial assignments"
          description="Optional. Leave blank to assign the project manager and directors later from Settings."
        >
          <FormSelect
            name="projectManager"
            control={control}
            label="Project manager"
            options={userSelectOptions}
          />
          <Controller
            name="assignedDirectors"
            control={control}
            render={({ field, fieldState }) => (
              <FormControl fullWidth error={Boolean(fieldState.error)}>
                <InputLabel id="assigned-directors-label">
                  Assigned directors
                </InputLabel>
                <Select
                  {...field}
                  labelId="assigned-directors-label"
                  label="Assigned directors"
                  multiple
                  value={field.value ?? []}
                >
                  {userOptions.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.fullName} · {user.userCode}
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error?.message ? (
                  <FormHelperText>{fieldState.error.message}</FormHelperText>
                ) : null}
              </FormControl>
            )}
          />
        </FormSection>
      ) : null}

      <FormSection
        title="RERA"
        description="Optional. Not required to create a project — add details when registration is available."
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="reraDetails.reraNumber"
            control={control}
            label="RERA number"
          />
          <FormTextField
            name="reraDetails.authority"
            control={control}
            label="Authority"
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <DateInput
            name="reraDetails.registrationDate"
            control={control}
            label="Registration date"
          />
          <DateInput
            name="reraDetails.validUntil"
            control={control}
            label="Valid until"
          />
        </Stack>
        <FormTextField
          name="reraDetails.notes"
          control={control}
          label="RERA notes"
          multiline
          minRows={2}
        />
      </FormSection>

      <Stack direction="row" spacing={1.5}>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create project'
              : 'Save changes'}
        </Button>
        {onCancel ? (
          <Button type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
      </Stack>
    </Stack>
    </FormProvider>
  );
}
