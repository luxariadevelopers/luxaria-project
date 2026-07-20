import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Autocomplete,
  CircularProgress,
  TextField,
  type TextFieldProps,
} from '@mui/material';
import type { SelectOption } from '@luxaria/shared-types';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

export type AsyncSelectLoadOptions = (
  input: string,
) => Promise<SelectOption[]>;

type AsyncSelectProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  loadOptions: AsyncSelectLoadOptions;
  getOptionLabel?: (option: SelectOption) => string;
  helperText?: TextFieldProps['helperText'];
  disabled?: boolean;
  required?: boolean;
  debounceMs?: number;
};

/**
 * Async option picker for foreign keys (vendor, project, etc.).
 * Stores the option `value` (usually an id string) in the form.
 */
export function AsyncSelect<T extends FieldValues>({
  name,
  control,
  label,
  loadOptions,
  getOptionLabel = (o) => o.label,
  helperText,
  disabled,
  required,
  debounceMs = 300,
}: AsyncSelectProps<T>) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const requestId = useRef(0);
  const cacheRef = useRef<Map<string, SelectOption>>(new Map());

  const fetchOptions = useCallback(
    async (input: string) => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const result = await loadOptions(input);
        if (id !== requestId.current) return;
        for (const opt of result) {
          cacheRef.current.set(String(opt.value), opt);
        }
        setOptions(result);
      } catch {
        if (id === requestId.current) {
          setOptions([]);
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false);
        }
      }
    },
    [loadOptions],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchOptions(inputValue);
    }, debounceMs);
    return () => window.clearTimeout(handle);
  }, [inputValue, debounceMs, fetchOptions]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selected =
          field.value != null && field.value !== ''
            ? (cacheRef.current.get(String(field.value)) ??
              options.find((o) => String(o.value) === String(field.value)) ?? {
                value: String(field.value),
                label: String(field.value),
              })
            : null;

        return (
          <Autocomplete
            options={options}
            loading={loading}
            disabled={disabled}
            value={selected}
            inputValue={inputValue}
            onInputChange={(_, value, reason) => {
              if (reason === 'input' || reason === 'clear') {
                setInputValue(value);
              }
            }}
            onChange={(_, option) => {
              if (option) {
                cacheRef.current.set(String(option.value), option);
              }
              field.onChange(option ? option.value : '');
            }}
            onBlur={field.onBlur}
            getOptionLabel={getOptionLabel}
            isOptionEqualToValue={(a, b) => String(a.value) === String(b.value)}
            filterOptions={(x) => x}
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                required={required}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? helperText}
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps.input,
                    endAdornment: (
                      <>
                        {loading ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : null}
                        {params.slotProps.input.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
        );
      }}
    />
  );
}
