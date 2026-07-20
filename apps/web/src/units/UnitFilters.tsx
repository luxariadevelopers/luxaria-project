import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { UNIT_STATUS_OPTIONS, UNIT_TYPE_OPTIONS } from './labels';
import type { UnitStatus, UnitType } from './types';

export type UnitFilterState = {
  status: '' | UnitStatus;
  unitType: '' | UnitType;
  block: string;
  floor: string;
};

type Props = {
  value: UnitFilterState;
  onChange: (next: UnitFilterState) => void;
};

export function UnitFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      data-testid="unit-filters"
      sx={{ flexWrap: 'wrap' }}
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="unit-status-filter">Status</InputLabel>
        <Select
          labelId="unit-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as UnitFilterState['status'],
            })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {UNIT_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="unit-type-filter">Type</InputLabel>
        <Select
          labelId="unit-type-filter"
          label="Type"
          value={value.unitType}
          onChange={(e) =>
            onChange({
              ...value,
              unitType: e.target.value as UnitFilterState['unitType'],
            })
          }
        >
          <MenuItem value="">All types</MenuItem>
          {UNIT_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size="small"
        label="Block"
        placeholder="e.g. A"
        value={value.block}
        onChange={(e) => onChange({ ...value, block: e.target.value })}
        sx={{ minWidth: 100 }}
      />

      <TextField
        size="small"
        label="Floor"
        placeholder="e.g. 12"
        value={value.floor}
        onChange={(e) => onChange({ ...value, floor: e.target.value })}
        sx={{ minWidth: 100 }}
      />
    </Stack>
  );
}
