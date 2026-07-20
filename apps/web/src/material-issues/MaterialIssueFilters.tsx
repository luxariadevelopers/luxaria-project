import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { MATERIAL_ISSUE_STATUS_OPTIONS } from './labels';

export type MaterialIssueFilterState = {
  status: string;
};

type Props = {
  value: MaterialIssueFilterState;
  onChange: (next: MaterialIssueFilterState) => void;
};

export function MaterialIssueFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="material-issue-filters"
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="mi-status-filter">Status</InputLabel>
        <Select
          labelId="mi-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          {MATERIAL_ISSUE_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
