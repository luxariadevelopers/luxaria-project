import { MenuItem, Stack, TextField } from '@mui/material';
import { AGREEMENT_STATUS_OPTIONS } from './labels';
import type { ContractorAgreementStatus } from './types';

export type AgreementFilterState = {
  status: ContractorAgreementStatus | '';
  contractorId: string;
};

type Props = {
  value: AgreementFilterState;
  onChange: (next: AgreementFilterState) => void;
  contractorOptions?: Array<{ id: string; label: string }>;
};

export function AgreementFilters({
  value,
  onChange,
  contractorOptions = [],
}: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <TextField
        select
        size="small"
        label="Status"
        value={value.status}
        onChange={(e) =>
          onChange({
            ...value,
            status: e.target.value as AgreementFilterState['status'],
          })
        }
        sx={{ minWidth: 180 }}
        data-testid="agreement-filter-status"
      >
        <MenuItem value="">All statuses</MenuItem>
        {AGREEMENT_STATUS_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Contractor"
        value={value.contractorId}
        onChange={(e) =>
          onChange({ ...value, contractorId: e.target.value })
        }
        sx={{ minWidth: 220 }}
        data-testid="agreement-filter-contractor"
      >
        <MenuItem value="">All contractors</MenuItem>
        {contractorOptions.map((opt) => (
          <MenuItem key={opt.id} value={opt.id}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
