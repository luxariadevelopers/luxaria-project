import { FormControl, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import {
  CASH_ACCOUNT_KIND_OPTIONS,
  CASH_ACCOUNT_STATUS_OPTIONS,
} from './labels';
import type { CashAccountKind, CashAccountStatus } from './types';

export type CashAccountFilterState = {
  kind: '' | CashAccountKind;
  status: '' | CashAccountStatus;
};

type Props = {
  value: CashAccountFilterState;
  onChange: (next: CashAccountFilterState) => void;
};

export function CashAccountFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      data-testid="cash-account-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="cash-kind-filter">Kind</InputLabel>
        <Select
          labelId="cash-kind-filter"
          label="Kind"
          value={value.kind}
          onChange={(e) =>
            onChange({
              ...value,
              kind: e.target.value as CashAccountFilterState['kind'],
            })
          }
        >
          <MenuItem value="">All kinds</MenuItem>
          {CASH_ACCOUNT_KIND_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="cash-status-filter">Status</InputLabel>
        <Select
          labelId="cash-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as CashAccountFilterState['status'],
            })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {CASH_ACCOUNT_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
