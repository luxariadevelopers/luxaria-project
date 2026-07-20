import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { ProjectOption } from '@luxaria/shared-types';
import type { FundingFilterState } from './types';

type Props = {
  value: FundingFilterState;
  projects: readonly ProjectOption[];
  onChange: (next: FundingFilterState) => void;
};

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FundingFilters({ value, projects, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="funding-filters"
    >
      <TextField
        size="small"
        type="date"
        label="As-of date"
        required
        error={!value.date}
        value={value.date}
        onChange={(e) => onChange({ ...value, date: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 180 }}
      />
      <FormControl
        size="small"
        sx={{ minWidth: 220 }}
        required
        error={!value.projectId}
      >
        <InputLabel id="funding-project-filter">Project</InputLabel>
        <Select
          labelId="funding-project-filter"
          label="Project"
          value={value.projectId}
          onChange={(e) =>
            onChange({ ...value, projectId: e.target.value })
          }
        >
          <MenuItem value="">
            <em>Select project</em>
          </MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.projectCode} — {p.projectName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
