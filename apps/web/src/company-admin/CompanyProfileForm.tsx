import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { getErrorMessage, toAppError } from '@/api/errors';
import { FieldErrorSummary } from '@/components/errors';
import { FormSection } from '@/components/forms/FormSection';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { FINANCIAL_YEAR_MONTH_OPTIONS } from './constants';
import { useUpdateCompanyProfile } from './hooks';
import type { PublicCompany } from './types';
import {
  buildCompanyProfileDefaults,
  companyProfileFormSchema,
  resolveCompanyProfileField,
  toUpdateCompanyInput,
  type CompanyProfileFormValues,
} from './validation';

type Props = {
  company: PublicCompany;
  canUpdate: boolean;
};

export function CompanyProfileForm({ company, canUpdate }: Props) {
  const notify = useNotify();
  const mutation = useUpdateCompanyProfile(company.id);
  const [serverError, setServerError] = useState<unknown>();
  const defaults = useMemo(() => buildCompanyProfileDefaults(company), [company]);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isDirty },
  } = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileFormSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const appError = useMemo(
    () => (serverError ? toAppError(serverError, 'Unable to update company profile') : null),
    [serverError],
  );

  useEffect(() => {
    if (!appError) return;
    for (const [field, message] of Object.entries(appError.fieldErrors)) {
      const path = resolveCompanyProfileField(field);
      if (path) {
        setError(path, { type: 'server', message });
      }
    }
  }, [appError, setError]);

  const submit = async (values: CompanyProfileFormValues) => {
    if (!canUpdate) return;
    setServerError(undefined);
    try {
      await mutation.mutateAsync(toUpdateCompanyInput(values));
      notify.success('Company profile updated');
    } catch (error) {
      setServerError(error);
      notify.error(getErrorMessage(error, 'Company profile could not be updated'));
    }
  };

  return (
    <Stack
      component="form"
      spacing={2.5}
      data-testid="company-profile-form"
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
    >
      {appError ? (
        <Alert severity="error">
          {appError.message}
          <FieldErrorSummary error={appError} />
        </Alert>
      ) : null}

      <FormSection
        title="Profile"
        description="Company code, primary-company status, and lifecycle status are server-controlled on this screen."
        disabled={!canUpdate}
        disabledReason="You need company.update to edit the profile."
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField name="tradeName" control={control} label="Trade name" required />
          <FormTextField name="email" control={control} label="Email" type="email" />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField name="phone" control={control} label="Phone" type="tel" />
          <FormTextField name="website" control={control} label="Website" />
          <Controller
            name="financialYearStartMonth"
            control={control}
            render={({ field, fieldState }) => (
              <FormControl fullWidth error={Boolean(fieldState.error)}>
                <InputLabel id="financial-year-month-label">Financial year starts</InputLabel>
                <Select
                  {...field}
                  labelId="financial-year-month-label"
                  label="Financial year starts"
                >
                  {FINANCIAL_YEAR_MONTH_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error?.message ? (
                  <FormHelperText>{fieldState.error.message}</FormHelperText>
                ) : null}
              </FormControl>
            )}
          />
        </Stack>
      </FormSection>

      <FormSection
        title="Registered address"
        disabled={!canUpdate}
        disabledReason="You need company.update to edit addresses."
      >
        <FormTextField
          name="registeredAddress.line1"
          control={control}
          label="Address line 1"
          required
        />
        <FormTextField name="registeredAddress.line2" control={control} label="Address line 2" />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField name="registeredAddress.city" control={control} label="City" required />
          <FormTextField name="registeredAddress.state" control={control} label="State" required />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="registeredAddress.pincode"
            control={control}
            label="PIN code"
            required
            slotProps={{
              htmlInput: { inputMode: 'numeric', maxLength: 6 },
            }}
          />
          <FormTextField
            name="registeredAddress.country"
            control={control}
            label="Country"
            required
          />
        </Stack>
      </FormSection>

      <FormSection
        title="Corporate address"
        disabled={!canUpdate}
        disabledReason="You need company.update to edit addresses."
      >
        <FormTextField
          name="corporateAddress.line1"
          control={control}
          label="Address line 1"
          required
        />
        <FormTextField name="corporateAddress.line2" control={control} label="Address line 2" />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField name="corporateAddress.city" control={control} label="City" required />
          <FormTextField name="corporateAddress.state" control={control} label="State" required />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="corporateAddress.pincode"
            control={control}
            label="PIN code"
            required
            slotProps={{
              htmlInput: { inputMode: 'numeric', maxLength: 6 },
            }}
          />
          <FormTextField
            name="corporateAddress.country"
            control={control}
            label="Country"
            required
          />
        </Stack>
      </FormSection>

      <FormSection
        title="Address history note"
        description="When either address changes, the backend closes the previous period and appends a history row."
        disabled={!canUpdate}
        disabledReason="You need company.update to edit addresses."
      >
        <FormTextField
          name="addressChangeReason"
          control={control}
          label="Change reason"
          multiline
          minRows={2}
          helperText="Optional, but recommended when changing an address."
        />
      </FormSection>

      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={!canUpdate || mutation.isPending || !isDirty}
        >
          {mutation.isPending ? 'Saving…' : 'Save profile'}
        </Button>
        <Button
          type="button"
          onClick={() => {
            reset(defaults);
            setServerError(undefined);
          }}
          disabled={mutation.isPending || !isDirty}
        >
          Reset
        </Button>
      </Stack>
    </Stack>
  );
}
