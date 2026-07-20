import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { receiptStatusLabel } from './labels';
import { ContributionReceiptStatus } from './types';

export type ContributionReceiptFilterState = {
  status: string;
};

type Props = {
  value: ContributionReceiptFilterState;
  onChange: (next: ContributionReceiptFilterState) => void;
};

const STATUS_OPTIONS = Object.values(ContributionReceiptStatus);

export function ContributionReceiptFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="contribution-receipt-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="receipt-status-filter">Status</InputLabel>
        <Select
          labelId="receipt-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {receiptStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
