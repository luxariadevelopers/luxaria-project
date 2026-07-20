import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { ProjectOption } from '@luxaria/shared-types';
import type {
  CommandCentreQuery,
  PublicDirectorOption,
  PublicFinancialYearOption,
} from './types';

export type DirectorFilterState = {
  date: string;
  projectId: string;
  directorId: string;
  financialYearId: string;
};

type Props = {
  value: DirectorFilterState;
  onChange: (next: DirectorFilterState) => void;
  projects: readonly ProjectOption[];
  directors: readonly PublicDirectorOption[];
  financialYears: readonly PublicFinancialYearOption[];
  showDirectorFilter: boolean;
  showFinancialYearFilter: boolean;
};

export function toCommandCentreQuery(
  state: DirectorFilterState,
): CommandCentreQuery {
  return {
    date: state.date || undefined,
    projectId: state.projectId || undefined,
    directorId: state.directorId || undefined,
    financialYearId: state.financialYearId || undefined,
  };
}

export function DirectorFilters({
  value,
  onChange,
  projects,
  directors,
  financialYears,
  showDirectorFilter,
  showFinancialYearFilter,
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      data-testid="director-filters"
      sx={{ alignItems: { xs: 'stretch', md: 'center' }, flexWrap: 'wrap' }}
    >
      <TextField
        size="small"
        type="date"
        label="As-of date"
        slotProps={{ inputLabel: { shrink: true } }}
        value={value.date}
        onChange={(e) => onChange({ ...value, date: e.target.value })}
        sx={{ minWidth: 160 }}
      />

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="dcc-project-filter">Project</InputLabel>
        <Select
          labelId="dcc-project-filter"
          label="Project"
          value={value.projectId}
          onChange={(e) => onChange({ ...value, projectId: e.target.value })}
        >
          <MenuItem value="">
            <em>All accessible</em>
          </MenuItem>
          {projects.map((project) => (
            <MenuItem key={project.id} value={project.id}>
              {project.projectCode} · {project.projectName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {showDirectorFilter ? (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="dcc-director-filter">Director</InputLabel>
          <Select
            labelId="dcc-director-filter"
            label="Director"
            value={value.directorId}
            onChange={(e) =>
              onChange({ ...value, directorId: e.target.value })
            }
          >
            <MenuItem value="">
              <em>All directors</em>
            </MenuItem>
            {directors.map((director) => (
              <MenuItem key={director.id} value={director.id}>
                {director.fullName} ({director.directorCode})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}

      {showFinancialYearFilter ? (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="dcc-fy-filter">Financial year</InputLabel>
          <Select
            labelId="dcc-fy-filter"
            label="Financial year"
            value={value.financialYearId}
            onChange={(e) =>
              onChange({ ...value, financialYearId: e.target.value })
            }
          >
            <MenuItem value="">
              <em>No FY filter</em>
            </MenuItem>
            {financialYears.map((fy) => (
              <MenuItem key={fy.id} value={fy.id}>
                {fy.name}
                {fy.isCurrent ? ' (current)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
    </Stack>
  );
}

/** Today as `YYYY-MM-DD` (local calendar for the date input). */
export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
