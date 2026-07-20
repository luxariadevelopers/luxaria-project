import { FormControl, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import { cancellationStatusLabel } from './labels';
import { BookingCancellationStatus } from './types';

export type CancellationFilterState = {
  status: string;
};

type Props = {
  value: CancellationFilterState;
  onChange: (next: CancellationFilterState) => void;
};

const STATUS_OPTIONS = Object.values(BookingCancellationStatus);

export function CancellationFilters({ value, onChange }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="cancellation-status-filter">Status</InputLabel>
        <Select
          labelId="cancellation-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>
              {cancellationStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
