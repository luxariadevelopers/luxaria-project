import { FormControl, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import {
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
} from './labels';
import type { LeadSource, LeadStatus } from './types';

export type LeadFilterState = {
  status: LeadStatus | '';
  source: LeadSource | '';
};

type Props = {
  value: LeadFilterState;
  onChange: (next: LeadFilterState) => void;
};

export function LeadFilters({ value, onChange }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="lead-status-filter">Status</InputLabel>
        <Select
          labelId="lead-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({ ...value, status: e.target.value as LeadStatus | '' })
          }
        >
          <MenuItem value="">All</MenuItem>
          {LEAD_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="lead-source-filter">Source</InputLabel>
        <Select
          labelId="lead-source-filter"
          label="Source"
          value={value.source}
          onChange={(e) =>
            onChange({ ...value, source: e.target.value as LeadSource | '' })
          }
        >
          <MenuItem value="">All</MenuItem>
          {LEAD_SOURCE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
