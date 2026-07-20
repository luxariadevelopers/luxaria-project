import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import {
  CustomerFundingType,
  CustomerKycStatus,
  CustomerStatus,
} from './types';
import {
  customerStatusLabel,
  fundingTypeLabel,
  kycStatusLabel,
} from './kycState';

export type CustomerFilterState = {
  status: string;
  fundingType: string;
  kycStatus: string;
};

type Props = {
  value: CustomerFilterState;
  onChange: (next: CustomerFilterState) => void;
};

export function CustomerFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="customer-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="customer-status-filter">Status</InputLabel>
        <Select
          labelId="customer-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {Object.values(CustomerStatus).map((s) => (
            <MenuItem key={s} value={s}>
              {customerStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="customer-funding-filter">Funding</InputLabel>
        <Select
          labelId="customer-funding-filter"
          label="Funding"
          value={value.fundingType}
          onChange={(e) =>
            onChange({ ...value, fundingType: e.target.value })
          }
        >
          <MenuItem value="">All funding</MenuItem>
          {Object.values(CustomerFundingType).map((t) => (
            <MenuItem key={t} value={t}>
              {fundingTypeLabel(t)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="customer-kyc-filter">KYC</InputLabel>
        <Select
          labelId="customer-kyc-filter"
          label="KYC"
          value={value.kycStatus}
          onChange={(e) => onChange({ ...value, kycStatus: e.target.value })}
        >
          <MenuItem value="">All KYC</MenuItem>
          {Object.values(CustomerKycStatus).map((k) => (
            <MenuItem key={k} value={k}>
              {kycStatusLabel(k)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
