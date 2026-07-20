import { TextField, type TextFieldProps } from '@mui/material';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

type DateInputProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
} & Omit<
  TextFieldProps,
  'name' | 'defaultValue' | 'value' | 'onChange' | 'type'
>;

/**
 * Calendar date field storing `YYYY-MM-DD` (matches `isoDateOnlySchema` / DPR keys).
 */
export function DateInput<T extends FieldValues>({
  name,
  control,
  ...rest
}: DateInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...rest}
          {...field}
          type="date"
          fullWidth
          value={typeof field.value === 'string' ? field.value.slice(0, 10) : ''}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? rest.helperText}
          slotProps={{
            inputLabel: { shrink: true },
          }}
        />
      )}
    />
  );
}
