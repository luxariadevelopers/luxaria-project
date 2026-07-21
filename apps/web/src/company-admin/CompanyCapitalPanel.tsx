import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { getErrorMessage, toAppError } from '@/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FieldErrorSummary } from '@/components/errors';
import { FormSection } from '@/components/forms/FormSection';
import { FormTextField } from '@/components/forms/FormTextField';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { CAPITAL_TYPE_LABELS } from './constants';
import { useUpdateCompanyCapital } from './hooks';
import { CompanyCapitalType, type PublicCompany } from './types';
import {
  buildCompanyCapitalFormSchema,
  resolveCompanyCapitalField,
  toUpdateCapitalInput,
  type CompanyCapitalFormValues,
} from './validation';

type Props = {
  company: PublicCompany;
  canUpdate: boolean;
};

const emptyCapitalValues: CompanyCapitalFormValues = {
  capitalType: CompanyCapitalType.Authorised,
  newAmount: null,
  effectiveFrom: '',
  changeReason: '',
  reference: '',
};

export function CompanyCapitalPanel({ company, canUpdate }: Props) {
  const notify = useNotify();
  const mutation = useUpdateCompanyCapital(company.id);
  const [serverError, setServerError] = useState<unknown>();
  const [pendingValues, setPendingValues] = useState<CompanyCapitalFormValues | null>(null);
  const schema = useMemo(
    () =>
      buildCompanyCapitalFormSchema({
        authorisedShareCapital: company.authorisedShareCapital,
        paidUpShareCapital: company.paidUpShareCapital,
      }),
    [company.authorisedShareCapital, company.paidUpShareCapital],
  );
  const { control, handleSubmit, reset, setError, setValue } = useForm<CompanyCapitalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyCapitalValues,
  });
  const selectedType = useWatch({ control, name: 'capitalType' });

  const appError = useMemo(
    () => (serverError ? toAppError(serverError, 'Unable to update company capital') : null),
    [serverError],
  );

  useEffect(() => {
    if (!appError) return;
    for (const [field, message] of Object.entries(appError.fieldErrors)) {
      const path = resolveCompanyCapitalField(field);
      if (path) {
        setError(path, { type: 'server', message });
      }
    }
  }, [appError, setError]);

  const currentAmount =
    selectedType === CompanyCapitalType.PaidUp
      ? company.paidUpShareCapital
      : company.authorisedShareCapital;

  const confirmUpdate = async () => {
    if (!pendingValues || !canUpdate) return;
    setServerError(undefined);
    try {
      await mutation.mutateAsync(toUpdateCapitalInput(pendingValues));
      notify.success('Capital updated and an immutable history entry was appended');
      setPendingValues(null);
      reset(emptyCapitalValues);
    } catch (error) {
      setServerError(error);
      setPendingValues(null);
      notify.error(getErrorMessage(error, 'Company capital could not be updated'));
    }
  };

  const pendingCurrentAmount =
    pendingValues?.capitalType === CompanyCapitalType.PaidUp
      ? company.paidUpShareCapital
      : company.authorisedShareCapital;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }} data-testid="company-capital-panel">
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography variant="h6">Share capital</Typography>
          <Typography variant="body2" color="text.secondary">
            Authorised: {formatInr(company.authorisedShareCapital)} · Paid-up:{' '}
            {formatInr(company.paidUpShareCapital)}
          </Typography>
        </Stack>

        <Alert severity="warning" variant="outlined">
          A confirmed update changes the current snapshot and appends a permanent capital-history
          row. Existing history is never edited.
        </Alert>

        {appError ? (
          <Alert severity="error">
            {appError.message}
            <FieldErrorSummary error={appError} />
          </Alert>
        ) : null}

        <Stack
          component="form"
          spacing={2}
          onSubmit={(event) => {
            void handleSubmit((values) => setPendingValues(values))(event);
          }}
        >
          <FormSection
            title="Record capital change"
            disabled={!canUpdate}
            disabledReason="You need company.update to update capital."
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller
                name="capitalType"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth error={Boolean(fieldState.error)}>
                    <InputLabel id="capital-type-label">Capital type</InputLabel>
                    <Select
                      {...field}
                      labelId="capital-type-label"
                      label="Capital type"
                      onChange={(event) => {
                        field.onChange(event);
                        setValue('newAmount', null, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                    >
                      {Object.values(CompanyCapitalType).map((type) => (
                        <MenuItem key={type} value={type}>
                          {CAPITAL_TYPE_LABELS[type]}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error?.message ? (
                      <FormHelperText>{fieldState.error.message}</FormHelperText>
                    ) : null}
                  </FormControl>
                )}
              />
              <MoneyInput
                name="newAmount"
                control={control}
                label="New amount"
                required
                helperText={`Current amount: ${formatInr(currentAmount)}`}
              />
              <FormTextField
                name="effectiveFrom"
                control={control}
                label="Effective from"
                type="date"
                helperText="Leave blank to use the server time."
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
            <FormTextField
              name="changeReason"
              control={control}
              label="Change reason"
              multiline
              minRows={2}
            />
            <FormTextField
              name="reference"
              control={control}
              label="Board resolution / ROC filing reference"
            />
          </FormSection>

          <Button
            type="submit"
            variant="contained"
            disabled={!canUpdate || mutation.isPending}
            sx={{ alignSelf: 'flex-start' }}
          >
            Review capital update
          </Button>
        </Stack>
      </Stack>

      <ConfirmDialog
        open={Boolean(pendingValues)}
        title="Confirm capital update"
        description={
          pendingValues?.newAmount == null
            ? undefined
            : `${CAPITAL_TYPE_LABELS[pendingValues.capitalType]} will change from ${formatInr(
                pendingCurrentAmount,
              )} to ${formatInr(
                pendingValues.newAmount,
              )}. This appends an immutable history entry and cannot be edited from this interface.`
        }
        confirmLabel="Confirm and append"
        loading={mutation.isPending}
        onConfirm={() => void confirmUpdate()}
        onCancel={() => setPendingValues(null)}
      />
    </Paper>
  );
}
