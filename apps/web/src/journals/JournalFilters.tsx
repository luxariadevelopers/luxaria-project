import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { ProjectOption } from '@luxaria/shared-types';
import type { PublicFinancialYearOption } from '@/director-command-centre/types';
import {
  JOURNAL_SOURCE_MODULE_OPTIONS,
  JOURNAL_STATUS_OPTIONS,
  journalStatusLabel,
} from './labels';
import type { JournalFilterState } from './validateFilters';

type Props = {
  value: JournalFilterState;
  onChange: (next: JournalFilterState) => void;
  projects: readonly ProjectOption[];
  financialYears: readonly PublicFinancialYearOption[];
  /** When false, FY select is hidden (missing financial_year.view). */
  showFinancialYear?: boolean;
  fieldErrors?: Partial<Record<keyof JournalFilterState, string>>;
};

export function JournalFilters({
  value,
  onChange,
  projects,
  financialYears,
  showFinancialYear = true,
  fieldErrors = {},
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'flex-start' } }}
      data-testid="journal-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }} error={Boolean(fieldErrors.status)}>
        <InputLabel id="journal-status-filter">Status</InputLabel>
        <Select
          labelId="journal-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {JOURNAL_STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {journalStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
        {fieldErrors.status ? (
          <FormHelperText>{fieldErrors.status}</FormHelperText>
        ) : null}
      </FormControl>

      {showFinancialYear ? (
        <FormControl
          size="small"
          sx={{ minWidth: 180 }}
          error={Boolean(fieldErrors.financialYearId)}
        >
          <InputLabel id="journal-fy-filter">Financial year</InputLabel>
          <Select
            labelId="journal-fy-filter"
            label="Financial year"
            value={value.financialYearId}
            onChange={(e) =>
              onChange({ ...value, financialYearId: e.target.value })
            }
          >
            <MenuItem value="">All years</MenuItem>
            {financialYears.map((fy) => (
              <MenuItem key={fy.id} value={fy.id}>
                {fy.name}
                {fy.isCurrent ? ' (current)' : ''}
              </MenuItem>
            ))}
          </Select>
          {fieldErrors.financialYearId ? (
            <FormHelperText>{fieldErrors.financialYearId}</FormHelperText>
          ) : null}
        </FormControl>
      ) : null}

      <FormControl
        size="small"
        sx={{ minWidth: 180 }}
        error={Boolean(fieldErrors.projectId)}
      >
        <InputLabel id="journal-project-filter">Project</InputLabel>
        <Select
          labelId="journal-project-filter"
          label="Project"
          value={value.projectId}
          onChange={(e) => onChange({ ...value, projectId: e.target.value })}
        >
          <MenuItem value="">All projects</MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.projectCode
                ? `${p.projectCode} · ${p.projectName}`
                : p.projectName}
            </MenuItem>
          ))}
        </Select>
        {fieldErrors.projectId ? (
          <FormHelperText>{fieldErrors.projectId}</FormHelperText>
        ) : null}
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="journal-source-filter">Source</InputLabel>
        <Select
          labelId="journal-source-filter"
          label="Source"
          value={value.sourceModule}
          onChange={(e) =>
            onChange({ ...value, sourceModule: e.target.value })
          }
        >
          <MenuItem value="">All sources</MenuItem>
          {JOURNAL_SOURCE_MODULE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size="small"
        type="date"
        label="From"
        value={value.from}
        error={Boolean(fieldErrors.from)}
        helperText={fieldErrors.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 150 }}
      />
      <TextField
        size="small"
        type="date"
        label="To"
        value={value.to}
        error={Boolean(fieldErrors.to)}
        helperText={fieldErrors.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 150 }}
      />
    </Stack>
  );
}
