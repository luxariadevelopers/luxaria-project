import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  type SelectChangeEvent,
} from '@mui/material';
import { PERIOD_STATUS_OPTIONS, PERIOD_TYPE_OPTIONS } from './labels';

export type PeriodFilterState = {
  financialYearId: string;
  periodType: string;
  status: string;
};

type FyOption = {
  id: string;
  name: string;
};

type Props = {
  value: PeriodFilterState;
  onChange: (next: PeriodFilterState) => void;
  financialYears: FyOption[];
  showFinancialYear: boolean;
};

export function PeriodFilters({
  value,
  onChange,
  financialYears,
  showFinancialYear,
}: Props) {
  const set =
    (key: keyof PeriodFilterState) => (event: SelectChangeEvent<string>) => {
      onChange({ ...value, [key]: event.target.value });
    };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="period-close-filters"
    >
      {showFinancialYear ? (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="period-fy-label">Financial year</InputLabel>
          <Select
            labelId="period-fy-label"
            label="Financial year"
            value={value.financialYearId}
            onChange={set('financialYearId')}
          >
            <MenuItem value="">All years</MenuItem>
            {financialYears.map((fy) => (
              <MenuItem key={fy.id} value={fy.id}>
                {fy.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="period-type-label">Type</InputLabel>
        <Select
          labelId="period-type-label"
          label="Type"
          value={value.periodType}
          onChange={set('periodType')}
        >
          <MenuItem value="">All types</MenuItem>
          {PERIOD_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="period-status-label">Status</InputLabel>
        <Select
          labelId="period-status-label"
          label="Status"
          value={value.status}
          onChange={set('status')}
        >
          <MenuItem value="">All statuses</MenuItem>
          {PERIOD_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
