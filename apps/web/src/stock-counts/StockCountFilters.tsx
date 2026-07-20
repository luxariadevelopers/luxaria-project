import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { STOCK_COUNT_STATUS_OPTIONS, stockCountStatusLabel } from './labels';
import type { StockCountFilterState, StockCountStatus } from './types';

type Props = {
  value: StockCountFilterState;
  fieldErrors?: Partial<Record<keyof StockCountFilterState, string>>;
  onChange: (next: StockCountFilterState) => void;
};

export function StockCountFilters({ value, fieldErrors, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="stock-count-filters"
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="stock-count-status-label">Status</InputLabel>
        <Select
          labelId="stock-count-status-label"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as '' | StockCountStatus,
            })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {STOCK_COUNT_STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>
              {stockCountStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Location"
        value={value.location}
        error={Boolean(fieldErrors?.location)}
        helperText={fieldErrors?.location}
        onChange={(e) => onChange({ ...value, location: e.target.value })}
        sx={{ minWidth: 160 }}
      />
    </Stack>
  );
}
