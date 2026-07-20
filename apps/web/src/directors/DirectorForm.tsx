import { Button, Stack } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { DateInput } from '@/components/forms/DateInput';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { DIRECTOR_STATUS_OPTIONS } from './directorStatus';
import {
  directorFormSchema,
  type DirectorFormValues,
} from './validation';
import type { PublicDirector } from './types';

type Props = {
  initial?: PublicDirector | null;
  readOnly?: boolean;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: DirectorFormValues) => void | Promise<void>;
};

export function DirectorForm({
  initial,
  readOnly = false,
  submitting = false,
  submitLabel = 'Save',
  onSubmit,
}: Props) {
  const { control, handleSubmit } = useForm<DirectorFormValues>({
    resolver: zodResolver(directorFormSchema),
    defaultValues: {
      fullName: initial?.fullName ?? '',
      din: initial?.din ?? '',
      pan: initial?.pan ?? '',
      email: initial?.email ?? '',
      phone: initial?.phone ?? '',
      address: initial?.address ?? '',
      appointmentDate: initial?.appointmentDate
        ? initial.appointmentDate.slice(0, 10)
        : '',
      status: initial?.status ?? 'active',
    },
  });

  return (
    <Stack
      component="form"
      spacing={2}
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      data-testid="director-form"
    >
      <FormTextField
        name="fullName"
        control={control}
        label="Full name"
        required
        disabled={readOnly}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormTextField
          name="din"
          control={control}
          label="DIN"
          helperText="8 digits when provided"
          disabled={readOnly}
          slotProps={{ htmlInput: { maxLength: 8 } }}
        />
        <FormTextField
          name="pan"
          control={control}
          label="PAN"
          helperText="e.g. ABCDE1234F"
          disabled={readOnly}
          slotProps={{
            htmlInput: {
              maxLength: 10,
              style: { textTransform: 'uppercase' },
            },
          }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormTextField
          name="email"
          control={control}
          label="Email"
          disabled={readOnly}
        />
        <FormTextField
          name="phone"
          control={control}
          label="Phone"
          disabled={readOnly}
        />
      </Stack>
      <FormTextField
        name="address"
        control={control}
        label="Address"
        multiline
        minRows={2}
        disabled={readOnly}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DateInput
          name="appointmentDate"
          control={control}
          label="Appointment date"
          disabled={readOnly}
        />
        <FormSelect
          name="status"
          control={control}
          label="Status"
          options={DIRECTOR_STATUS_OPTIONS}
          disabled={readOnly}
        />
      </Stack>
      {!readOnly ? (
        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
          sx={{ alignSelf: 'flex-start' }}
        >
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      ) : null}
    </Stack>
  );
}
