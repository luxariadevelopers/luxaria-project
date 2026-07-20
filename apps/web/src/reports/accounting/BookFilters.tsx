import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AccountSelector } from './AccountSelector';
import type { AccountOption, BookFilterState } from './types';

type ProjectOption = {
  id: string;
  projectCode: string;
  projectName: string;
};

type FinancialYearOption = {
  id: string;
  name: string;
  isCurrent?: boolean;
};

type Props = {
  value: BookFilterState;
  onChange: (next: BookFilterState) => void;
  projects: readonly ProjectOption[];
  financialYears: readonly FinancialYearOption[];
  accounts: readonly AccountOption[];
  canSelectFinancialYear: boolean;
  accountsLoading?: boolean;
  fieldErrors?: Partial<Record<keyof BookFilterState, string>>;
};

export function BookFilters({
  value,
  onChange,
  projects,
  financialYears,
  accounts,
  canSelectFinancialYear,
  accountsLoading = false,
  fieldErrors,
}: Props) {
  const patch = (partial: Partial<BookFilterState>) =>
    onChange({ ...value, ...partial });

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Filters
      </Typography>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
      >
        <FormControl
          size="small"
          sx={{ minWidth: 220, flex: 1 }}
          required
          error={Boolean(fieldErrors?.financialYearId)}
          disabled={!canSelectFinancialYear}
        >
          <InputLabel id="book-fy-label">Financial year</InputLabel>
          <Select
            labelId="book-fy-label"
            label="Financial year"
            value={value.financialYearId}
            onChange={(event) =>
              patch({ financialYearId: event.target.value })
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

        <FormControl size="small" sx={{ minWidth: 220, flex: 1 }}>
          <InputLabel id="book-project-label">Project</InputLabel>
          <Select
            labelId="book-project-label"
            label="Project"
            value={value.projectId}
            onChange={(event) => patch({ projectId: event.target.value })}
          >
            <MenuItem value="">
              <em>All projects</em>
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
          label="From"
          slotProps={{ inputLabel: { shrink: true } }}
          value={value.from}
          onChange={(event) => patch({ from: event.target.value })}
          error={Boolean(fieldErrors?.from)}
          helperText={fieldErrors?.from}
          sx={{ minWidth: 160 }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          slotProps={{ inputLabel: { shrink: true } }}
          value={value.to}
          onChange={(event) => patch({ to: event.target.value })}
          error={Boolean(fieldErrors?.to)}
          helperText={fieldErrors?.to}
          sx={{ minWidth: 160 }}
        />

        <Stack sx={{ minWidth: 260, flex: 1 }}>
          <AccountSelector
            value={value.accountId}
            options={accounts}
            loading={accountsLoading}
            onChange={(accountId) => patch({ accountId })}
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
