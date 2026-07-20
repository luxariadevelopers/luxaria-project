import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import {
  qualityInspectionResultLabel,
  qualityInspectionStatusLabel,
} from './labels';
import {
  QualityInspectionResult,
  QualityInspectionStatus,
} from './types';

export type QualityInspectionFilterState = {
  status: string;
  result: string;
};

type Props = {
  value: QualityInspectionFilterState;
  onChange: (next: QualityInspectionFilterState) => void;
};

const STATUS_OPTIONS = Object.values(QualityInspectionStatus);
const RESULT_OPTIONS = Object.values(QualityInspectionResult);

export function QualityInspectionFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' as const } }}
      data-testid="quality-inspection-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="qi-status-filter">Status</InputLabel>
        <Select
          labelId="qi-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {qualityInspectionStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="qi-result-filter">Result</InputLabel>
        <Select
          labelId="qi-result-filter"
          label="Result"
          value={value.result}
          onChange={(e) => onChange({ ...value, result: e.target.value })}
        >
          <MenuItem value="">All results</MenuItem>
          {RESULT_OPTIONS.map((r) => (
            <MenuItem key={r} value={r}>
              {qualityInspectionResultLabel(r)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
