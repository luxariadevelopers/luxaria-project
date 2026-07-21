import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { customerInvoiceStatusLabel } from './labels';
import {
  CustomerInvoiceStatus,
  type CustomerInvoiceStatus as Status,
} from './types';

export type CustomerInvoiceFilterState = {
  status: Status | '';
  customerId: string;
  bookingId: string;
};

type Props = {
  value: CustomerInvoiceFilterState;
  onChange: (next: CustomerInvoiceFilterState) => void;
};

export function CustomerInvoiceFilters({ value, onChange }: Props) {
  const patch = (partial: Partial<CustomerInvoiceFilterState>) =>
    onChange({ ...value, ...partial });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="ci-status">Status</InputLabel>
        <Select
          labelId="ci-status"
          label="Status"
          value={value.status}
          onChange={(e) => patch({ status: e.target.value as Status | '' })}
        >
          <MenuItem value="">
            <em>All statuses</em>
          </MenuItem>
          {Object.values(CustomerInvoiceStatus).map((s) => (
            <MenuItem key={s} value={s}>
              {customerInvoiceStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Customer ID"
        value={value.customerId}
        onChange={(e) => patch({ customerId: e.target.value })}
        sx={{ minWidth: 180 }}
      />
      <TextField
        size="small"
        label="Booking ID"
        value={value.bookingId}
        onChange={(e) => patch({ bookingId: e.target.value })}
        sx={{ minWidth: 180 }}
      />
    </Stack>
  );
}
