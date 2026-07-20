import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import {
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from './types';
import { invoiceStatusLabel, matchingStatusLabel } from './labels';

export type InvoiceFilterState = {
  status: string;
  matchingStatus: string;
};

type Props = {
  value: InvoiceFilterState;
  onChange: (next: InvoiceFilterState) => void;
};

export function InvoiceFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      data-testid="vendor-invoice-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="vi-status-filter">Status</InputLabel>
        <Select
          labelId="vi-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({ ...value, status: String(e.target.value) })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {Object.values(VendorInvoiceStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {invoiceStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="vi-match-filter">Matching</InputLabel>
        <Select
          labelId="vi-match-filter"
          label="Matching"
          value={value.matchingStatus}
          onChange={(e) =>
            onChange({ ...value, matchingStatus: String(e.target.value) })
          }
        >
          <MenuItem value="">All matching</MenuItem>
          {Object.values(VendorInvoiceMatchingStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {matchingStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
