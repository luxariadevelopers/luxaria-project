import { useEffect, useMemo } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { AccountingPeriodType } from './types';
import { useCreateAccountingPeriod } from './usePeriodClose';
import {
  createAccountingPeriodSchema,
  type CreateAccountingPeriodFormValues,
} from './validation';

type FyOption = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  financialYears: FyOption[];
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: String(i + 1),
}));

export function CreatePeriodDrawer({
  open,
  onClose,
  financialYears,
}: Props) {
  const createMut = useCreateAccountingPeriod();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } =
    useForm<CreateAccountingPeriodFormValues>({
      resolver: zodResolver(createAccountingPeriodSchema),
      defaultValues: {
        periodType: AccountingPeriodType.Monthly,
        financialYearId: '',
        month: undefined,
        year: undefined,
        notes: '',
      },
    });

  const periodType = useWatch({ control, name: 'periodType' });

  const fyOptions = useMemo(
    () => financialYears.map((fy) => ({ value: fy.id, label: fy.name })),
    [financialYears],
  );

  useEffect(() => {
    if (!open) {
      reset({
        periodType: AccountingPeriodType.Monthly,
        financialYearId: '',
        month: undefined,
        year: undefined,
        notes: '',
      });
    }
  }, [open, reset]);

  const onSubmit = async (values: CreateAccountingPeriodFormValues) => {
    try {
      await createMut.mutateAsync({
        periodType: values.periodType,
        financialYearId: values.financialYearId,
        month:
          values.periodType === AccountingPeriodType.Monthly
            ? values.month
            : undefined,
        year:
          values.periodType === AccountingPeriodType.Monthly
            ? values.year
            : undefined,
        notes: values.notes?.trim() || undefined,
      });
      success('Accounting period created');
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
        paper: { sx: { width: { xs: '100%', sm: 420 } } },
      }}
    >
      <Box sx={{ p: 3 }} component="form" onSubmit={handleSubmit(onSubmit)}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create period
        </Typography>
        <Stack spacing={2}>
          <FormSelect
            name="periodType"
            control={control}
            label="Period type"
            required
            options={[
              { value: AccountingPeriodType.Monthly, label: 'Monthly' },
              {
                value: AccountingPeriodType.FinancialYear,
                label: 'Financial year',
              },
            ]}
          />
          <FormSelect
            name="financialYearId"
            control={control}
            label="Financial year"
            required
            options={fyOptions}
          />
          {periodType === AccountingPeriodType.Monthly ? (
            <>
              <FormSelect
                name="month"
                control={control}
                label="Month"
                required
                options={MONTH_OPTIONS}
              />
              <FormTextField
                name="year"
                control={control}
                label="Calendar year (optional)"
                type="number"
              />
            </>
          ) : null}
          <FormTextField
            name="notes"
            control={control}
            label="Notes (optional)"
            multiline
            minRows={2}
          />
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'flex-end' }}
          >
            <Button onClick={onClose} disabled={createMut.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMut.isPending}
            >
              {createMut.isPending ? 'Creating…' : 'Create'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
