import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { MATERIAL_STATUS_OPTIONS, MATERIAL_UNIT_OPTIONS } from './labels';
import type { MaterialStatus, MaterialUnit } from './types';

export type MaterialFilterState = {
  status: '' | MaterialStatus;
  category: string;
  baseUnit: '' | MaterialUnit;
};

type Props = {
  value: MaterialFilterState;
  onChange: (next: MaterialFilterState) => void;
  /** Optional known categories from the current result set. */
  categorySuggestions?: readonly string[];
};

export function MaterialFilters({
  value,
  onChange,
  categorySuggestions = [],
}: Props) {
  const categories = [...new Set(categorySuggestions.filter(Boolean))].sort();

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      data-testid="material-filters"
      sx={{ flexWrap: 'wrap' }}
    >
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="material-status-filter">Status</InputLabel>
        <Select
          labelId="material-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as MaterialFilterState['status'],
            })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {MATERIAL_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size="small"
        label="Category"
        placeholder="e.g. cement"
        value={value.category}
        onChange={(e) => onChange({ ...value, category: e.target.value })}
        sx={{ minWidth: 160 }}
        slotProps={{ htmlInput: { list: 'material-category-suggestions' } }}
      />
      <datalist id="material-category-suggestions">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="material-unit-filter">Base unit</InputLabel>
        <Select
          labelId="material-unit-filter"
          label="Base unit"
          value={value.baseUnit}
          onChange={(e) =>
            onChange({
              ...value,
              baseUnit: e.target.value as MaterialFilterState['baseUnit'],
            })
          }
        >
          <MenuItem value="">All units</MenuItem>
          {MATERIAL_UNIT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
