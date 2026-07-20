import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { GRN_STATUS_OPTIONS, grnStatusLabel } from './labels';

export type GrnFilterState = {
  status: string;
};

type Props = {
  value: GrnFilterState;
  onChange: (next: GrnFilterState) => void;
};

export function GrnFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="grn-filters"
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="grn-status-filter">Status</InputLabel>
        <Select
          labelId="grn-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {GRN_STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {grnStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
