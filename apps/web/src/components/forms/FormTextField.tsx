import { TextField, type TextFieldProps } from '@mui/material';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

type FormTextFieldProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
} & Omit<TextFieldProps, 'name' | 'defaultValue' | 'value' | 'onChange'>;

export function FormTextField<T extends FieldValues>({
  name,
  control,
  ...rest
}: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...rest}
          {...field}
          value={field.value ?? ''}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? rest.helperText}
          fullWidth
        />
      )}
    />
  );
}
