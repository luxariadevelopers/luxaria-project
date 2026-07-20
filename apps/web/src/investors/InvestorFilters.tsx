import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import {
  InvestorKycStatus,
  InvestorStatus,
  InvestorType,
} from './types';
import {
  investorStatusLabel,
  investorTypeLabel,
  kycStatusLabel,
} from './kycState';

export type InvestorFilterState = {
  status: string;
  investorType: string;
  kycStatus: string;
};

type Props = {
  value: InvestorFilterState;
  onChange: (next: InvestorFilterState) => void;
};

export function InvestorFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="investor-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="investor-status-filter">Status</InputLabel>
        <Select
          labelId="investor-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {Object.values(InvestorStatus).map((s) => (
            <MenuItem key={s} value={s}>
              {investorStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="investor-type-filter">Type</InputLabel>
        <Select
          labelId="investor-type-filter"
          label="Type"
          value={value.investorType}
          onChange={(e) =>
            onChange({ ...value, investorType: e.target.value })
          }
        >
          <MenuItem value="">All types</MenuItem>
          {Object.values(InvestorType).map((t) => (
            <MenuItem key={t} value={t}>
              {investorTypeLabel(t)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="investor-kyc-filter">KYC</InputLabel>
        <Select
          labelId="investor-kyc-filter"
          label="KYC"
          value={value.kycStatus}
          onChange={(e) => onChange({ ...value, kycStatus: e.target.value })}
        >
          <MenuItem value="">All KYC</MenuItem>
          {Object.values(InvestorKycStatus).map((k) => (
            <MenuItem key={k} value={k}>
              {kycStatusLabel(k)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
