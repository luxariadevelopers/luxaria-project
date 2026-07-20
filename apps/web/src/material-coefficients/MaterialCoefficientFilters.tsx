import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { MaterialCoefficientStatus } from './types';
import type { MaterialScopeMode } from './types';

export type MaterialCoefficientFilterState = {
  scopeMode: MaterialScopeMode;
  status: MaterialCoefficientStatus | '';
};

type Props = {
  value: MaterialCoefficientFilterState;
  onChange: (next: MaterialCoefficientFilterState) => void;
  projectSelected: boolean;
};

export function MaterialCoefficientFilters({
  value,
  onChange,
  projectSelected,
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
    >
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value.scopeMode}
        onChange={(_e, next) => {
          if (next === null) return;
          onChange({ ...value, scopeMode: next as MaterialScopeMode });
        }}
      >
        <ToggleButton value="global">Company-wide</ToggleButton>
        <ToggleButton value="project" disabled={!projectSelected}>
          Project
        </ToggleButton>
      </ToggleButtonGroup>

      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="mcs-status-filter">Status</InputLabel>
        <Select
          labelId="mcs-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as MaterialCoefficientFilterState['status'],
            })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value={MaterialCoefficientStatus.Draft}>Draft</MenuItem>
          <MenuItem value={MaterialCoefficientStatus.PendingApproval}>
            Pending approval
          </MenuItem>
          <MenuItem value={MaterialCoefficientStatus.Active}>Active</MenuItem>
          <MenuItem value={MaterialCoefficientStatus.Superseded}>Superseded</MenuItem>
          <MenuItem value={MaterialCoefficientStatus.Rejected}>Rejected</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}
