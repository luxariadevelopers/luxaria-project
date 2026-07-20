import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { vendorStatusLabel, vendorVerificationLabel } from './labels';
import {
  VendorStatus,
  VendorVerificationStatus,
} from './types';

export type VendorFilterState = {
  status: string;
  verificationStatus: string;
  materialCategory: string;
};

type Props = {
  value: VendorFilterState;
  onChange: (next: VendorFilterState) => void;
};

export function VendorFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="vendor-filters"
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="vendor-status-filter">Status</InputLabel>
        <Select
          labelId="vendor-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
          data-testid="vendor-status-filter"
        >
          <MenuItem value="">All statuses</MenuItem>
          {Object.values(VendorStatus).map((s) => (
            <MenuItem key={s} value={s} data-testid={`vendor-status-option-${s}`}>
              {vendorStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="vendor-verification-filter">Verification</InputLabel>
        <Select
          labelId="vendor-verification-filter"
          label="Verification"
          value={value.verificationStatus}
          onChange={(e) =>
            onChange({ ...value, verificationStatus: e.target.value })
          }
        >
          <MenuItem value="">All verification</MenuItem>
          {Object.values(VendorVerificationStatus).map((v) => (
            <MenuItem key={v} value={v}>
              {vendorVerificationLabel(v)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Material category"
        placeholder="e.g. steel"
        value={value.materialCategory}
        onChange={(e) =>
          onChange({ ...value, materialCategory: e.target.value })
        }
        sx={{ minWidth: 160 }}
        slotProps={{
          htmlInput: { 'data-testid': 'vendor-category-filter' },
        }}
      />
    </Stack>
  );
}
