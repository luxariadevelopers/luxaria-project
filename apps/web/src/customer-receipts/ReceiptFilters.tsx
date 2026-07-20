import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { receiptStatusLabel, sourceTypeLabel } from './labels';
import {
  CustomerReceiptSourceType,
  CustomerReceiptStatus,
} from './types';

export type ReceiptFilterState = {
  status: '' | CustomerReceiptStatus;
  sourceType: '' | CustomerReceiptSourceType;
  search: string;
};

type Props = {
  value: ReceiptFilterState;
  onChange: (next: ReceiptFilterState) => void;
};

export function ReceiptFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      data-testid="receipt-filters"
    >
      <TextField
        size="small"
        label="Search"
        placeholder="Receipt no / txn ref"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        sx={{ minWidth: 220 }}
      />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="receipt-status-filter">Status</InputLabel>
        <Select
          labelId="receipt-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as ReceiptFilterState['status'],
            })
          }
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(CustomerReceiptStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {receiptStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="receipt-source-filter">Source</InputLabel>
        <Select
          labelId="receipt-source-filter"
          label="Source"
          value={value.sourceType}
          onChange={(e) =>
            onChange({
              ...value,
              sourceType: e.target.value as ReceiptFilterState['sourceType'],
            })
          }
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(CustomerReceiptSourceType).map((source) => (
            <MenuItem key={source} value={source}>
              {sourceTypeLabel(source)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
