import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { BOOKING_STATUS_FILTER_OPTIONS } from './labels';

export type BookingFilterState = {
  status: string;
};

type Props = {
  value: BookingFilterState;
  onChange: (next: BookingFilterState) => void;
};

export function BookingFilters({ value, onChange }: Props) {
  return (
    <FormControl size="small" sx={{ minWidth: 180 }}>
      <InputLabel id="booking-status-filter-label">Status</InputLabel>
      <Select
        labelId="booking-status-filter-label"
        label="Status"
        value={value.status}
        onChange={(e) => onChange({ status: e.target.value })}
        data-testid="booking-status-filter"
      >
        {BOOKING_STATUS_FILTER_OPTIONS.map((opt) => (
          <MenuItem key={opt.value || 'all'} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
