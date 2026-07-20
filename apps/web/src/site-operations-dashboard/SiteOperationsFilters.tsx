import { FormControl, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material';
import type { ProjectOption } from '@luxaria/shared-types';

export type SiteOpsFilterState = {
  date: string;
  projectId: string;
};

type Props = {
  value: SiteOpsFilterState;
  onChange: (next: SiteOpsFilterState) => void;
  projects: readonly ProjectOption[];
};

export function SiteOperationsFilters({ value, onChange, projects }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
    >
      <TextField
        size="small"
        type="date"
        label="As-of date (UTC)"
        value={value.date}
        onChange={(e) => {
          onChange({ ...value, date: e.target.value });
        }}
        helperText="Aligned with Nest project dashboard / DPR UTC day"
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 200 }}
      />
      <FormControl size="small" sx={{ minWidth: 240 }}>
        <InputLabel id="site-ops-project-label">Project</InputLabel>
        <Select
          labelId="site-ops-project-label"
          label="Project"
          value={value.projectId}
          onChange={(e) => {
            onChange({ ...value, projectId: e.target.value });
          }}
        >
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
