import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { ProjectOption } from '@luxaria/shared-types';
import { costCentreKindLabel, costCentreStatusLabel } from './labels';
import { CostCentreKind, CostCentreStatus, type CostCentreKind as Kind, type CostCentreStatus as Status } from './types';

export type CostCentreFilterState = {
  search: string;
  projectId: string;
  kind: Kind | '';
  status: Status | '';
};

type Props = {
  value: CostCentreFilterState;
  onChange: (next: CostCentreFilterState) => void;
  projects: readonly ProjectOption[];
};

export function CostCentreFilters({ value, onChange, projects }: Props) {
  const patch = (partial: Partial<CostCentreFilterState>) =>
    onChange({ ...value, ...partial });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <TextField
        size="small"
        label="Search"
        value={value.search}
        onChange={(e) => patch({ search: e.target.value })}
        sx={{ minWidth: 200 }}
      />
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="cost-centre-project">Project</InputLabel>
        <Select
          labelId="cost-centre-project"
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
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="cost-centre-kind">Kind</InputLabel>
        <Select
          labelId="cost-centre-kind"
          label="Kind"
          value={value.kind}
          onChange={(e) => patch({ kind: e.target.value as Kind | '' })}
        >
          <MenuItem value="">
            <em>All kinds</em>
          </MenuItem>
          {Object.values(CostCentreKind).map((kind) => (
            <MenuItem key={kind} value={kind}>
              {costCentreKindLabel(kind)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="cost-centre-status">Status</InputLabel>
        <Select
          labelId="cost-centre-status"
          label="Status"
          value={value.status}
          onChange={(e) => patch({ status: e.target.value as Status | '' })}
        >
          <MenuItem value="">
            <em>All statuses</em>
          </MenuItem>
          {Object.values(CostCentreStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {costCentreStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
