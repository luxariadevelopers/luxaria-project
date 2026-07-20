import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  type SelectProps,
} from '@mui/material';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

export type SelectOption = {
  label: string;
  value: string | number;
};

type FormSelectProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  options: SelectOption[];
} & Omit<SelectProps, 'name' | 'value' | 'onChange' | 'label'>;

export function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  ...rest
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl fullWidth error={Boolean(fieldState.error)}>
          <InputLabel id={`${String(name)}-label`}>{label}</InputLabel>
          <Select
            {...rest}
            {...field}
            labelId={`${String(name)}-label`}
            label={label}
            value={field.value ?? ''}
          >
            {options.map((opt) => (
              <MenuItem key={String(opt.value)} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {fieldState.error?.message ? (
            <FormHelperText>{fieldState.error.message}</FormHelperText>
          ) : null}
        </FormControl>
      )}
    />
  );
}
