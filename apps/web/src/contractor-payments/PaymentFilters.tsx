import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { paymentStatusLabel } from './labels';
import { ContractorPaymentStatus } from './types';

export type PaymentFilterState = {
  status: string;
};

type Props = {
  value: PaymentFilterState;
  onChange: (next: PaymentFilterState) => void;
};

export function PaymentFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      data-testid="contractor-payment-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="cp-status-filter">Status</InputLabel>
        <Select
          labelId="cp-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({ ...value, status: String(e.target.value) })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {Object.values(ContractorPaymentStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {paymentStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
