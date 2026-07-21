import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { SignedPaymentVoucherStatus } from '@luxaria/shared-types';
import { signedPaymentVoucherStatusLabel } from './labels';

export type VoucherFilterState = {
  status: string;
};

type Props = {
  value: VoucherFilterState;
  onChange: (next: VoucherFilterState) => void;
};

const STATUS_OPTIONS = Object.values(SignedPaymentVoucherStatus);

export function VoucherFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="signed-voucher-filters"
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="signed-voucher-status-filter">Status</InputLabel>
        <Select
          labelId="signed-voucher-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
          data-testid="signed-voucher-status-filter"
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {signedPaymentVoucherStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
