import { Stack, Typography } from '@mui/material';
import type { Control } from 'react-hook-form';
import { DateInput } from '@/components/forms/DateInput';
import { FormSection } from '@/components/forms/FormSection';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { BookingFundingType } from './types';
import { fundingTypeLabel } from './labels';
import type { BookingFormValues } from './validation';

const FUNDING_OPTIONS = Object.values(BookingFundingType).map((value) => ({
  value,
  label: fundingTypeLabel(value),
}));

type Props = {
  control: Control<BookingFormValues>;
  customerOptions: readonly { value: string; label: string }[];
  unitOptions: readonly { value: string; label: string }[];
  customersLoading?: boolean;
  unitsLoading?: boolean;
  readOnlyProject?: boolean;
};

export function BookingForm({
  control,
  customerOptions,
  unitOptions,
  customersLoading,
  unitsLoading,
}: Props) {
  return (
    <Stack spacing={3}>
      <FormSection title="Parties & unit">
        <Stack spacing={2}>
          <FormSelect
            name="customerId"
            control={control}
            label="Customer"
            options={[...customerOptions]}
            disabled={customersLoading || customerOptions.length === 0}
            required
          />
          <FormSelect
            name="unitId"
            control={control}
            label="Unit"
            options={[...unitOptions]}
            disabled={unitsLoading || unitOptions.length === 0}
            required
          />
          <FormSelect
            name="fundingType"
            control={control}
            label="Funding type"
            options={FUNDING_OPTIONS}
            required
          />
        </Stack>
      </FormSection>

      <FormSection title="Commercials">
        <Stack spacing={2}>
          <DateInput
            name="bookingDate"
            control={control}
            label="Booking date"
          />
          <MoneyInput
            name="bookingAmount"
            control={control}
            label="Booking amount (token)"
            required
          />
          <MoneyInput
            name="agreedPrice"
            control={control}
            label="Agreed price"
            required
          />
          <MoneyInput
            name="discount"
            control={control}
            label="Discount"
          />
          <FormTextField
            name="holdHours"
            control={control}
            label="Hold hours (optional override)"
            type="number"
            helperText="Defaults to server config when omitted."
          />
        </Stack>
      </FormSection>

      <FormSection title="Notes">
        <FormTextField
          name="remarks"
          control={control}
          label="Remarks"
          multiline
          minRows={2}
        />
      </FormSection>

      {customerOptions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Add customers with customer.view before creating a booking.
        </Typography>
      ) : null}
      {unitOptions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No units loaded for the selected project. Check unit.view and project
          scope.
        </Typography>
      ) : null}
    </Stack>
  );
}
