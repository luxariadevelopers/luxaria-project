import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { transferStatusLabel } from './labels';
import { PettyCashFundTransferStatus } from './types';

export type TransferFilterState = {
  status: string;
};

type Props = {
  value: TransferFilterState;
  onChange: (next: TransferFilterState) => void;
};

const STATUS_OPTIONS = Object.values(PettyCashFundTransferStatus);

export function TransferFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="petty-cash-transfer-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="pcft-status-filter">Status</InputLabel>
        <Select
          labelId="pcft-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {transferStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
