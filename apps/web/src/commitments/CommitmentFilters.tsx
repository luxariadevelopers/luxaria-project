import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
} from '@mui/material';
import type { CommitmentAmendmentFilter } from './applyClientFilters';
import { commitmentStatusLabel } from './labels';
import { CommitmentStatus } from './types';

export type CommitmentFilterState = {
  status: string;
  amendment: CommitmentAmendmentFilter;
  overdueOnly: boolean;
};

type Props = {
  value: CommitmentFilterState;
  onChange: (next: CommitmentFilterState) => void;
};

const STATUS_OPTIONS = Object.values(CommitmentStatus);

export function CommitmentFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="commitment-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="commitment-status-filter">Status</InputLabel>
        <Select
          labelId="commitment-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {commitmentStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="commitment-amendment-filter">Versions</InputLabel>
        <Select
          labelId="commitment-amendment-filter"
          label="Versions"
          value={value.amendment}
          onChange={(e) =>
            onChange({
              ...value,
              amendment: e.target.value as CommitmentAmendmentFilter,
            })
          }
          data-testid="commitment-amendment-filter"
        >
          <MenuItem value="all">All versions</MenuItem>
          <MenuItem value="current">Current (hide superseded)</MenuItem>
          <MenuItem value="amendments">Amendments (v&gt;1)</MenuItem>
          <MenuItem value="superseded">Superseded only</MenuItem>
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch
            checked={value.overdueOnly}
            onChange={(e) =>
              onChange({ ...value, overdueOnly: e.target.checked })
            }
            data-testid="commitment-overdue-filter"
          />
        }
        label="Overdue only"
      />
    </Stack>
  );
}
