import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { ProjectOption } from '@luxaria/shared-types';

export type PurchaseFilterState = {
  date: string;
  projectId: string;
};

type Props = {
  value: PurchaseFilterState;
  onChange: (next: PurchaseFilterState) => void;
  projects: readonly ProjectOption[];
};

export function PurchaseFilters({ value, onChange, projects }: Props) {
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
        label="As-of date"
        required
        value={value.date}
        onChange={(e) => {
          onChange({ ...value, date: e.target.value });
        }}
        helperText="Required — used for due delivery and payment-due ageing"
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 200 }}
      />
      <FormControl size="small" sx={{ minWidth: 240 }} required>
        <InputLabel id="purchase-dash-project-label">Project</InputLabel>
        <Select
          labelId="purchase-dash-project-label"
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
