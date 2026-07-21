import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { ErrorAlert } from '@/components/errors';
import type { FinancialYearCompany } from './types';
import {
  financialYearFormDefaults,
  financialYearFormSchema,
  type FinancialYearFormValues,
} from './validation';

type Props = {
  company: FinancialYearCompany;
  submitting?: boolean;
  serverError?: unknown;
  onSubmit: (values: FinancialYearFormValues) => Promise<void> | void;
  onCancel: () => void;
};

export function FinancialYearForm({
  company,
  submitting = false,
  serverError,
  onSubmit,
  onCancel,
}: Props) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FinancialYearFormValues>({
    resolver: zodResolver(financialYearFormSchema),
    defaultValues: financialYearFormDefaults,
  });

  const setAsCurrent = watch('setAsCurrent');
  const companyLabel =
    company.tradeName?.trim() ||
    company.legalName?.trim() ||
    company.companyCode;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack
        component="form"
        noValidate
        spacing={2}
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        {serverError ? (
          <ErrorAlert
            error={serverError}
            title="Financial year was not created"
          />
        ) : null}

        <TextField
          label="Company"
          value={`${companyLabel} · ${company.companyCode}`}
          fullWidth
          slotProps={{ input: { readOnly: true } }}
          helperText="Company is fixed from your authenticated tenant."
        />

        <TextField
          label="Financial year name"
          autoFocus
          fullWidth
          error={Boolean(errors.name)}
          helperText={errors.name?.message}
          {...register('name')}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Start date"
            type="date"
            fullWidth
            error={Boolean(errors.startDate)}
            helperText={errors.startDate?.message}
            slotProps={{ inputLabel: { shrink: true } }}
            {...register('startDate')}
          />
          <TextField
            label="End date"
            type="date"
            fullWidth
            error={Boolean(errors.endDate)}
            helperText={errors.endDate?.message}
            slotProps={{ inputLabel: { shrink: true } }}
            {...register('endDate')}
          />
        </Stack>

        <Controller
          control={control}
          name="setAsCurrent"
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={(_, checked) => field.onChange(checked)}
                />
              }
              label="Set as the current financial year"
            />
          )}
        />

        {setAsCurrent ? (
          <Alert severity="warning" variant="outlined">
            Creating this year will clear the current marker from the
            company&apos;s existing current financial year.
          </Alert>
        ) : null}

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create financial year'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
