import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import {
  RUNNING_BILL_STATUS_FILTER_OPTIONS,
  runningBillStatusLabel,
} from './labels';

export type RunningBillFilterState = {
  status: string;
  /** Client-only inclusive billing period from (`YYYY-MM-DD`). */
  periodFrom: string;
  /** Client-only inclusive billing period to (`YYYY-MM-DD`). */
  periodTo: string;
};

type Props = {
  value: RunningBillFilterState;
  onChange: (next: RunningBillFilterState) => void;
};

export function RunningBillFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="running-bill-filters"
    >
      <TextField
        size="small"
        type="date"
        label="Period from"
        value={value.periodFrom}
        onChange={(e) => onChange({ ...value, periodFrom: e.target.value })}
        sx={{ minWidth: 160 }}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { 'data-testid': 'running-bill-period-from' },
        }}
      />
      <TextField
        size="small"
        type="date"
        label="Period to"
        value={value.periodTo}
        onChange={(e) => onChange({ ...value, periodTo: e.target.value })}
        sx={{ minWidth: 160 }}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { 'data-testid': 'running-bill-period-to' },
        }}
      />
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="running-bill-status-filter">Status</InputLabel>
        <Select
          labelId="running-bill-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
          data-testid="running-bill-status-filter"
        >
          <MenuItem value="">All statuses</MenuItem>
          {RUNNING_BILL_STATUS_FILTER_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {runningBillStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
