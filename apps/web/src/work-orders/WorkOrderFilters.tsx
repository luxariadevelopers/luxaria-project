import { MenuItem, Stack, TextField } from '@mui/material';
import { WORK_ORDER_STATUS_OPTIONS } from './labels';
import type { WorkOrderStatus } from './types';

export type WorkOrderFilterState = {
  status: WorkOrderStatus | '';
  contractorId: string;
};

type Props = {
  value: WorkOrderFilterState;
  onChange: (next: WorkOrderFilterState) => void;
  contractorOptions?: Array<{ id: string; label: string }>;
};

export function WorkOrderFilters({
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
            status: e.target.value as WorkOrderFilterState['status'],
          })
        }
        sx={{ minWidth: 180 }}
        data-testid="work-order-filter-status"
      >
        <MenuItem value="">All statuses</MenuItem>
        {WORK_ORDER_STATUS_OPTIONS.map((opt) => (
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
        data-testid="work-order-filter-contractor"
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
