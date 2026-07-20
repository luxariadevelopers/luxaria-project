import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import {
  REORDER_ALERT_STATUS_OPTIONS,
  REORDER_ALERT_TYPE_OPTIONS,
} from './labels';

export type ReorderAlertFilterState = {
  status: string;
  alertType: string;
};

type Props = {
  value: ReorderAlertFilterState;
  onChange: (next: ReorderAlertFilterState) => void;
};

export function ReorderAlertFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="reorder-alert-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="ra-status-filter">Status</InputLabel>
        <Select
          labelId="ra-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          {REORDER_ALERT_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value || 'all-status'} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="ra-type-filter">Alert type</InputLabel>
        <Select
          labelId="ra-type-filter"
          label="Alert type"
          value={value.alertType}
          onChange={(e) => onChange({ ...value, alertType: e.target.value })}
        >
          {REORDER_ALERT_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value || 'all-type'} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
