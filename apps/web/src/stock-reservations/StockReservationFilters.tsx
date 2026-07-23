import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import {
  STOCK_RESERVATION_SOURCE_OPTIONS,
  STOCK_RESERVATION_STATUS_OPTIONS,
  stockReservationSourceLabel,
  stockReservationStatusLabel,
} from './labels';
import type {
  StockReservationFilterState,
  StockReservationSourceType,
  StockReservationStatus,
} from './types';

type Props = {
  value: StockReservationFilterState;
  onChange: (next: StockReservationFilterState) => void;
};

export function StockReservationFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="stock-reservation-filters"
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="stock-reservation-status-label">Status</InputLabel>
        <Select
          labelId="stock-reservation-status-label"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as '' | StockReservationStatus,
            })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {STOCK_RESERVATION_STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>
              {stockReservationStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="stock-reservation-source-label">Source</InputLabel>
        <Select
          labelId="stock-reservation-source-label"
          label="Source"
          value={value.sourceType}
          onChange={(e) =>
            onChange({
              ...value,
              sourceType: e.target.value as '' | StockReservationSourceType,
            })
          }
        >
          <MenuItem value="">All sources</MenuItem>
          {STOCK_RESERVATION_SOURCE_OPTIONS.map((source) => (
            <MenuItem key={source} value={source}>
              {stockReservationSourceLabel(source)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
