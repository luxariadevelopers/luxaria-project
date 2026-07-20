import {
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import type { ProjectOption } from '@luxaria/shared-types';
import {
  BANK_ACCOUNT_STATUS_OPTIONS,
  bankAccountStatusLabel,
} from './labels';
import type { BankAccountFilterState } from './validation';

type Props = {
  value: BankAccountFilterState;
  onChange: (next: BankAccountFilterState) => void;
  projects: readonly ProjectOption[];
  fieldErrors?: Partial<Record<keyof BankAccountFilterState, string>>;
};

export function BankAccountFilters({
  value,
  onChange,
  projects,
  fieldErrors = {},
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="bank-account-filters"
    >
      <FormControl
        size="small"
        sx={{ minWidth: 160 }}
        error={Boolean(fieldErrors.status)}
      >
        <InputLabel id="bank-status-filter">Status</InputLabel>
        <Select
          labelId="bank-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {BANK_ACCOUNT_STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {bankAccountStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
        {fieldErrors.status ? (
          <FormHelperText>{fieldErrors.status}</FormHelperText>
        ) : null}
      </FormControl>

      <FormControl
        size="small"
        sx={{ minWidth: 200 }}
        error={Boolean(fieldErrors.projectId)}
        disabled={value.companyOnly}
      >
        <InputLabel id="bank-project-filter">Project</InputLabel>
        <Select
          labelId="bank-project-filter"
          label="Project"
          value={value.companyOnly ? '' : value.projectId}
          onChange={(e) =>
            onChange({
              ...value,
              projectId: e.target.value,
              companyOnly: false,
            })
          }
        >
          <MenuItem value="">All (company + project)</MenuItem>
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

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={value.companyOnly}
            onChange={(e) =>
              onChange({
                ...value,
                companyOnly: e.target.checked,
                projectId: e.target.checked ? '' : value.projectId,
              })
            }
          />
        }
        label="Company only"
      />

      <TextField
        size="small"
        label="Search"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        sx={{ minWidth: 200 }}
        placeholder="Code, bank, IFSC…"
        error={Boolean(fieldErrors.search)}
        helperText={fieldErrors.search}
      />
    </Stack>
  );
}
