import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { scheduleStatusLabel, scheduleTypeLabel } from './labels';
import {
  PaymentScheduleStatus,
  PaymentScheduleType,
  type PaymentScheduleStatusValue,
  type PaymentScheduleTypeValue,
} from './types';

export type PaymentScheduleFilterState = {
  status: '' | PaymentScheduleStatusValue;
  scheduleType: '' | PaymentScheduleTypeValue;
};

type Props = {
  value: PaymentScheduleFilterState;
  onChange: (next: PaymentScheduleFilterState) => void;
};

export function PaymentScheduleFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      data-testid="payment-schedule-filters"
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="payment-schedule-status-filter">Status</InputLabel>
        <Select
          labelId="payment-schedule-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as PaymentScheduleFilterState['status'],
            })
          }
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(PaymentScheduleStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {scheduleStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="payment-schedule-type-filter">Type</InputLabel>
        <Select
          labelId="payment-schedule-type-filter"
          label="Type"
          value={value.scheduleType}
          onChange={(e) =>
            onChange({
              ...value,
              scheduleType: e.target
                .value as PaymentScheduleFilterState['scheduleType'],
            })
          }
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(PaymentScheduleType).map((type) => (
            <MenuItem key={type} value={type}>
              {scheduleTypeLabel(type)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
