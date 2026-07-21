import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { ProjectOption } from '@luxaria/shared-types';
import { openingBalanceStatusLabel } from './labels';
import {
  OpeningBalancePackStatus,
  type OpeningBalancePackStatus as Status,
} from './types';

export type OpeningBalanceFilterState = {
  search: string;
  financialYearId: string;
  projectId: string;
  status: Status | '';
};

type FyOption = { id: string; name: string };

type Props = {
  value: OpeningBalanceFilterState;
  onChange: (next: OpeningBalanceFilterState) => void;
  projects: readonly ProjectOption[];
  financialYears: readonly FyOption[];
  showFinancialYear?: boolean;
};

export function OpeningBalanceFilters({
  value,
  onChange,
  projects,
  financialYears,
  showFinancialYear = true,
}: Props) {
  const patch = (partial: Partial<OpeningBalanceFilterState>) =>
    onChange({ ...value, ...partial });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <TextField
        size="small"
        label="Search pack #"
        value={value.search}
        onChange={(e) => patch({ search: e.target.value })}
        sx={{ minWidth: 180 }}
      />
      {showFinancialYear ? (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="ob-fy">Financial year</InputLabel>
          <Select
            labelId="ob-fy"
            label="Financial year"
            value={value.financialYearId}
            onChange={(e) => patch({ financialYearId: e.target.value })}
          >
            <MenuItem value="">
              <em>All years</em>
            </MenuItem>
            {financialYears.map((fy) => (
              <MenuItem key={fy.id} value={fy.id}>
                {fy.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="ob-project">Project</InputLabel>
        <Select
          labelId="ob-project"
          label="Project"
          value={value.projectId}
          onChange={(e) => patch({ projectId: e.target.value })}
        >
          <MenuItem value="">
            <em>All projects</em>
          </MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.projectCode ? `${p.projectCode} · ${p.projectName}` : p.projectName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="ob-status">Status</InputLabel>
        <Select
          labelId="ob-status"
          label="Status"
          value={value.status}
          onChange={(e) => patch({ status: e.target.value as Status | '' })}
        >
          <MenuItem value="">
            <em>All statuses</em>
          </MenuItem>
          {Object.values(OpeningBalancePackStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {openingBalanceStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
