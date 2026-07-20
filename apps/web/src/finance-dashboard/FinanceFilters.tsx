import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { ProjectOption } from '@luxaria/shared-types';
import type { PublicFinancialYearOption } from '@/director-command-centre/types';
import type { FinanceDashboardQuery } from './types';

export type FinanceFilterState = {
  date: string;
  projectId: string;
  financialYearId: string;
  horizonDays: string;
};

type Props = {
  value: FinanceFilterState;
  onChange: (next: FinanceFilterState) => void;
  projects: readonly ProjectOption[];
  financialYears: readonly PublicFinancialYearOption[];
  /** When false, FY select is disabled (missing `financial_year.view`). */
  canSelectFinancialYear: boolean;
};

export function toFinanceDashboardQuery(
  state: FinanceFilterState,
): FinanceDashboardQuery {
  const horizon = Number(state.horizonDays);
  return {
    date: state.date || undefined,
    projectId: state.projectId || undefined,
    financialYearId: state.financialYearId || undefined,
    horizonDays:
      Number.isFinite(horizon) && horizon >= 1 && horizon <= 180
        ? horizon
        : undefined,
  };
}

export function FinanceFilters({
  value,
  onChange,
  projects,
  financialYears,
  canSelectFinancialYear,
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      data-testid="finance-filters"
      sx={{ alignItems: { xs: 'stretch', md: 'center' }, flexWrap: 'wrap' }}
    >
      <FormControl
        size="small"
        sx={{ minWidth: 220 }}
        required
        error={!value.financialYearId}
        disabled={!canSelectFinancialYear}
      >
        <InputLabel id="fd-fy-filter">Financial year</InputLabel>
        <Select
          labelId="fd-fy-filter"
          label="Financial year"
          value={value.financialYearId}
          onChange={(e) =>
            onChange({ ...value, financialYearId: e.target.value })
          }
        >
          <MenuItem value="">
            <em>Select financial year</em>
          </MenuItem>
          {financialYears.map((fy) => (
            <MenuItem key={fy.id} value={fy.id}>
              {fy.name}
              {fy.isCurrent ? ' (current)' : ''}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="fd-project-filter">Project</InputLabel>
        <Select
          labelId="fd-project-filter"
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

      <TextField
        size="small"
        type="date"
        label="As-of date"
        slotProps={{ inputLabel: { shrink: true } }}
        value={value.date}
        onChange={(e) => onChange({ ...value, date: e.target.value })}
        sx={{ minWidth: 160 }}
      />

      <TextField
        size="small"
        type="number"
        label="Horizon (days)"
        value={value.horizonDays}
        onChange={(e) => onChange({ ...value, horizonDays: e.target.value })}
        slotProps={{ htmlInput: { min: 1, max: 180 } }}
        sx={{ minWidth: 140 }}
      />
    </Stack>
  );
}

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
