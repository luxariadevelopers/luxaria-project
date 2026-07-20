import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { purchaseOrderStatusLabel } from './labels';
import { PurchaseOrderStatus } from './types';
import type { PurchaseOrderFilterState } from './validateFilters';

type Props = {
  value: PurchaseOrderFilterState;
  onChange: (next: PurchaseOrderFilterState) => void;
  fieldErrors?: Partial<Record<keyof PurchaseOrderFilterState, string>>;
};

const STATUS_OPTIONS = Object.values(PurchaseOrderStatus);

export function POFilters({ value, onChange, fieldErrors }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="po-filters"
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="po-status-filter">Status</InputLabel>
        <Select
          labelId="po-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
          error={Boolean(fieldErrors?.status)}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {purchaseOrderStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size="small"
        label="Vendor id"
        value={value.vendorId}
        onChange={(e) => onChange({ ...value, vendorId: e.target.value })}
        error={Boolean(fieldErrors?.vendorId)}
        helperText={fieldErrors?.vendorId}
        sx={{ minWidth: 200 }}
      />

      <TextField
        size="small"
        label="PR id"
        value={value.purchaseRequestId}
        onChange={(e) =>
          onChange({ ...value, purchaseRequestId: e.target.value })
        }
        error={Boolean(fieldErrors?.purchaseRequestId)}
        helperText={fieldErrors?.purchaseRequestId}
        sx={{ minWidth: 200 }}
      />
    </Stack>
  );
}
