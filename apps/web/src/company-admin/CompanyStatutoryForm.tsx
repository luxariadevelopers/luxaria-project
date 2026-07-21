import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage, toAppError } from '@/api/errors';
import { FieldErrorSummary } from '@/components/errors';
import { FormSection } from '@/components/forms/FormSection';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { useUpdateCompanyStatutory } from './hooks';
import type { PublicCompany } from './types';
import {
  buildCompanyStatutoryDefaults,
  companyStatutoryFormSchema,
  resolveCompanyStatutoryField,
  toUpdateStatutoryInput,
  type CompanyStatutoryFormValues,
} from './validation';

type Props = {
  company: PublicCompany;
  canUpdate: boolean;
};

export function CompanyStatutoryForm({ company, canUpdate }: Props) {
  const notify = useNotify();
  const mutation = useUpdateCompanyStatutory(company.id);
  const [serverError, setServerError] = useState<unknown>();
  const defaults = useMemo(() => buildCompanyStatutoryDefaults(company), [company]);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isDirty },
  } = useForm<CompanyStatutoryFormValues>({
    resolver: zodResolver(companyStatutoryFormSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const appError = useMemo(
    () => (serverError ? toAppError(serverError, 'Unable to update statutory details') : null),
    [serverError],
  );

  useEffect(() => {
    if (!appError) return;
    for (const [field, message] of Object.entries(appError.fieldErrors)) {
      const path = resolveCompanyStatutoryField(field);
      if (path) {
        setError(path, { type: 'server', message });
      }
    }
  }, [appError, setError]);

  const submit = async (values: CompanyStatutoryFormValues) => {
    if (!canUpdate) return;
    setServerError(undefined);
    try {
      await mutation.mutateAsync(toUpdateStatutoryInput(values));
      notify.success('Statutory details updated');
    } catch (error) {
      setServerError(error);
      notify.error(getErrorMessage(error, 'Statutory details could not be updated'));
    }
  };

  return (
    <Stack
      component="form"
      spacing={2.5}
      data-testid="company-statutory-form"
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
        title="Statutory identity"
        description="Codes are normalized to uppercase before they are sent to the API."
        disabled={!canUpdate}
        disabledReason="You need company.update to edit statutory details."
      >
        <FormTextField name="legalName" control={control} label="Legal name" required />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="cin"
            control={control}
            label="CIN"
            helperText="Example: U45200TN2020PTC123456"
            slotProps={{ htmlInput: { autoCapitalize: 'characters' } }}
          />
          <FormTextField
            name="pan"
            control={control}
            label="PAN"
            helperText="Example: ABCDE1234F"
            slotProps={{ htmlInput: { autoCapitalize: 'characters' } }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="tan"
            control={control}
            label="TAN"
            helperText="Example: CHEL12345A"
            slotProps={{ htmlInput: { autoCapitalize: 'characters' } }}
          />
          <FormTextField
            name="gstin"
            control={control}
            label="GSTIN"
            helperText="Example: 33ABCDE1234F1Z5"
            slotProps={{ htmlInput: { autoCapitalize: 'characters' } }}
          />
        </Stack>
      </FormSection>

      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={!canUpdate || mutation.isPending || !isDirty}
        >
          {mutation.isPending ? 'Saving…' : 'Save statutory details'}
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
