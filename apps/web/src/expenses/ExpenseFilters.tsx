import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { expenseStatusLabel } from './labels';
import { SiteExpenseVoucherStatus } from './types';

export type ExpenseFilterState = {
  status: string;
  /** Client-only inclusive from (`YYYY-MM-DD`). */
  dateFrom: string;
  /** Client-only inclusive to (`YYYY-MM-DD`). */
  dateTo: string;
};

type Props = {
  value: ExpenseFilterState;
  onChange: (next: ExpenseFilterState) => void;
};

const STATUS_OPTIONS = Object.values(SiteExpenseVoucherStatus);

export function ExpenseFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="expense-filters"
    >
      <TextField
        size="small"
        type="date"
        label="Date from"
        value={value.dateFrom}
        onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
        sx={{ minWidth: 160 }}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { 'data-testid': 'expense-date-from-filter' },
        }}
      />
      <TextField
        size="small"
        type="date"
        label="Date to"
        value={value.dateTo}
        onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
        sx={{ minWidth: 160 }}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { 'data-testid': 'expense-date-to-filter' },
        }}
      />
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="expense-status-filter">Status</InputLabel>
        <Select
          labelId="expense-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
          data-testid="expense-status-filter"
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {expenseStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
