import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { pettyCashRequestStatusLabel } from './labels';
import { PettyCashRequirementStatus } from './types';

export type PettyCashRequestFilterState = {
  status: string;
  /** Client-only week start (`YYYY-MM-DD`). */
  weekStartDate: string;
};

type Props = {
  value: PettyCashRequestFilterState;
  onChange: (next: PettyCashRequestFilterState) => void;
};

const STATUS_OPTIONS = Object.values(PettyCashRequirementStatus);

export function RequestFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="petty-cash-request-filters"
    >
      <TextField
        size="small"
        type="date"
        label="Week start"
        value={value.weekStartDate}
        onChange={(e) =>
          onChange({ ...value, weekStartDate: e.target.value })
        }
        sx={{ minWidth: 170 }}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { 'data-testid': 'week-start-filter' },
        }}
      />
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="pcr-status-filter">Status</InputLabel>
        <Select
          labelId="pcr-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {pettyCashRequestStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
