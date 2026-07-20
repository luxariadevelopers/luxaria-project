import { useEffect, useState, type Ref } from 'react';

import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { roundMoney } from '@/validation';

type MoneyInputProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  /** Allow negative amounts (adjustments). Default false. */
  allowNegative?: boolean;
} & Omit<
  TextFieldProps,
  'name' | 'defaultValue' | 'value' | 'onChange' | 'type'
>;

function toDisplay(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

/**
 * Rupee amount field. Stores `number` (2 dp via `roundMoney` on blur).
 * Pair with `moneyNonNegativeSchema` / `moneyAmountSchema` at form level.
 */
export function MoneyInput<T extends FieldValues>({
  name,
  control,
  allowNegative = false,
  ...rest
}: MoneyInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <MoneyInputInner
          {...rest}
          name={field.name}
          inputRef={field.ref}
          allowNegative={allowNegative}
          value={field.value}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? rest.helperText}
          onCommit={(n) => field.onChange(n)}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}

type InnerProps = Omit<
  TextFieldProps,
  'name' | 'defaultValue' | 'value' | 'onChange' | 'type'
> & {
  name: string;
  value: unknown;
  allowNegative: boolean;
  onCommit: (value: number | null) => void;
  onBlur: () => void;
  inputRef: Ref<HTMLInputElement>;
  error: boolean;
};


function MoneyInputInner({
  name,
  value,
  allowNegative,
  onCommit,
  onBlur,
  inputRef,
  error,
  helperText,
  disabled,
  ...rest
}: InnerProps) {
  const [text, setText] = useState(() => toDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(toDisplay(value));
    }
  }, [value, focused]);

  return (
    <TextField
      {...rest}
      fullWidth
      inputMode="decimal"
      name={name}
      inputRef={inputRef}
      disabled={disabled}
      value={text}
      error={error}
      helperText={helperText}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const raw = text.replace(/,/g, '').trim();
        if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
          onCommit(null);
          setText('');
          onBlur();
          return;
        }
        const n = Number(raw);
        if (Number.isFinite(n)) {
          const rounded = roundMoney(n);
          onCommit(rounded);
          setText(String(rounded));
        }
        onBlur();
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, '');
        if (!allowNegative && raw.includes('-')) {
          return;
        }
        if (raw !== '' && !/^-?\d*\.?\d*$/.test(raw)) {
          return;
        }
        setText(raw);
        if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
          return;
        }
        const n = Number(raw);
        if (Number.isFinite(n)) {
          onCommit(n);
        }
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">₹</InputAdornment>
          ),
        },
      }}
    />
  );
}
