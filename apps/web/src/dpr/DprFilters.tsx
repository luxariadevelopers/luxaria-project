import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { DPR_STATUS_OPTIONS, dprStatusLabel } from './labels';
import type { DprFilterState, DprStatus } from './types';

type Props = {
  value: DprFilterState;
  onChange: (next: DprFilterState) => void;
};

export function DprFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="dpr-filters"
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="dpr-status-label">Status</InputLabel>
        <Select
          labelId="dpr-status-label"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as '' | DprStatus,
            })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {DPR_STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>
              {dprStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="From date"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={value.fromDate}
        onChange={(e) => onChange({ ...value, fromDate: e.target.value })}
      />
      <TextField
        size="small"
        label="To date"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={value.toDate}
        onChange={(e) => onChange({ ...value, toDate: e.target.value })}
      />
    </Stack>
  );
}
