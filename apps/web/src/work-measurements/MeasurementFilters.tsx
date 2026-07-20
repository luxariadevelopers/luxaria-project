import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { WORK_MEASUREMENT_STATUS_OPTIONS } from './labels';
import type { WorkMeasurementFilterState } from './types';

type Props = {
  value: WorkMeasurementFilterState;
  onChange: (next: WorkMeasurementFilterState) => void;
};

export function MeasurementFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="work-measurement-filters"
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="wm-status-filter">Status</InputLabel>
        <Select
          labelId="wm-status-filter"
          label="Status"
          value={value.status}
          onChange={(event) =>
            onChange({
              ...value,
              status: event.target.value as WorkMeasurementFilterState['status'],
            })
          }
        >
          {WORK_MEASUREMENT_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size="small"
        label="Contractor id"
        value={value.contractorId}
        onChange={(event) =>
          onChange({ ...value, contractorId: event.target.value })
        }
        placeholder="Filter by contractor ObjectId"
        sx={{ minWidth: 200 }}
      />

      <TextField
        size="small"
        label="BOQ item id"
        value={value.boqItemId}
        onChange={(event) =>
          onChange({ ...value, boqItemId: event.target.value })
        }
        placeholder="Filter by BOQ item ObjectId"
        sx={{ minWidth: 200 }}
      />

      <TextField
        size="small"
        label="From date"
        type="date"
        value={value.fromDate}
        onChange={(event) =>
          onChange({ ...value, fromDate: event.target.value })
        }
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 160 }}
      />

      <TextField
        size="small"
        label="To date"
        type="date"
        value={value.toDate}
        onChange={(event) =>
          onChange({ ...value, toDate: event.target.value })
        }
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 160 }}
      />
    </Stack>
  );
}
