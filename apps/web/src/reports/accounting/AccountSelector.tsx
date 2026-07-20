import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material';
import type { AccountOption } from './types';

type Props = {
  label?: string;
  value: string;
  options: readonly AccountOption[];
  loading?: boolean;
  disabled?: boolean;
  onChange: (accountId: string) => void;
};

/** Optional GL account filter for cash/bank books. */
export function AccountSelector({
  label = 'Account',
  value,
  options,
  loading = false,
  disabled = false,
  onChange,
}: Props) {
  return (
    <FormControl fullWidth size="small" disabled={disabled || loading}>
      <InputLabel id="cash-bank-account-label">{label}</InputLabel>
      <Select
        labelId="cash-bank-account-label"
        label={label}
        value={value}
        onChange={(event: SelectChangeEvent<string>) =>
          onChange(event.target.value)
        }
      >
        <MenuItem value="">
          <em>All accounts</em>
        </MenuItem>
        {options.map((account) => (
          <MenuItem key={account.id} value={account.id}>
            {account.accountCode} · {account.accountName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
