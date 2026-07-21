import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import {
  CONTRACTOR_TYPE_OPTIONS,
  contractorStatusLabel,
  contractorVerificationLabel,
} from './labels';
import {
  ContractorStatus,
  ContractorVerificationStatus,
} from './types';

export type ContractorFilterState = {
  status: string;
  verificationStatus: string;
  contractorType: string;
  workCategory: string;
};

type Props = {
  value: ContractorFilterState;
  onChange: (next: ContractorFilterState) => void;
};

export function ContractorFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="contractor-filters"
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="contractor-status-filter">Status</InputLabel>
        <Select
          labelId="contractor-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(ContractorStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {contractorStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="contractor-verification-filter">Verification</InputLabel>
        <Select
          labelId="contractor-verification-filter"
          label="Verification"
          value={value.verificationStatus}
          onChange={(e) =>
            onChange({ ...value, verificationStatus: e.target.value })
          }
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(ContractorVerificationStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {contractorVerificationLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="contractor-type-filter">Type</InputLabel>
        <Select
          labelId="contractor-type-filter"
          label="Type"
          value={value.contractorType}
          onChange={(e) =>
            onChange({ ...value, contractorType: e.target.value })
          }
        >
          <MenuItem value="">All</MenuItem>
          {CONTRACTOR_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size="small"
        label="Work category"
        value={value.workCategory}
        onChange={(e) =>
          onChange({ ...value, workCategory: e.target.value })
        }
        sx={{ minWidth: 160 }}
      />
    </Stack>
  );
}
