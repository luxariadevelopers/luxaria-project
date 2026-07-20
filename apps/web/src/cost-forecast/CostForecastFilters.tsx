import { Stack, TextField, Typography } from '@mui/material';

export type CostForecastFilterState = {
  date: string;
  from: string;
  to: string;
};

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  value: CostForecastFilterState;
  onChange: (next: CostForecastFilterState) => void;
  projectLabel?: string;
};

export function CostForecastFilters({
  value,
  onChange,
  projectLabel,
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
    >
      {projectLabel ? (
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {projectLabel}
        </Typography>
      ) : null}
      <TextField
        size="small"
        type="date"
        label="As-of date"
        slotProps={{ inputLabel: { shrink: true } }}
        value={value.date}
        onChange={(e) => onChange({ ...value, date: e.target.value })}
        sx={{ minWidth: 160 }}
      />
      <TextField
        size="small"
        type="date"
        label="Period from"
        slotProps={{ inputLabel: { shrink: true } }}
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        sx={{ minWidth: 160 }}
      />
      <TextField
        size="small"
        type="date"
        label="Period to"
        slotProps={{ inputLabel: { shrink: true } }}
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        sx={{ minWidth: 160 }}
      />
    </Stack>
  );
}

export function toCostForecastQuery(
  projectId: string,
  filters: CostForecastFilterState,
) {
  return {
    projectId,
    date: filters.date || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
}
