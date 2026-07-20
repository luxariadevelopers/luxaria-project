import {
  Checkbox,
  FormControlLabel,
  FormHelperText,
  FormControl,
} from '@mui/material';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

type FormCheckboxProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
};

export function FormCheckbox<T extends FieldValues>({
  name,
  control,
  label,
}: FormCheckboxProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl error={Boolean(fieldState.error)}>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(field.value)}
                onChange={(_, checked) => field.onChange(checked)}
              />
            }
            label={label}
          />
          {fieldState.error?.message ? (
            <FormHelperText>{fieldState.error.message}</FormHelperText>
          ) : null}
        </FormControl>
      )}
    />
  );
}
