import {
  Alert,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { formatDate, formatQuantity } from '@/format';
import type { EligibleWorkMeasurement } from './types';

type Props = {
  measurements: readonly EligibleWorkMeasurement[];
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  billedIds?: ReadonlySet<string>;
  loading?: boolean;
  disabled?: boolean;
  errorMessage?: string | null;
};

export function MeasurementSelector({
  measurements,
  selectedIds,
  onChange,
  billedIds,
  loading,
  disabled,
  errorMessage,
}: Props) {
  const selected = new Set(selectedIds);

  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      if (selected.has(id)) return;
      onChange([...selectedIds, id]);
      return;
    }
    onChange(selectedIds.filter((x) => x !== id));
  };

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      data-testid="measurement-selector"
    >
      <Typography variant="subtitle2" gutterBottom>
        Verified measurements
      </Typography>
      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {errorMessage}
        </Alert>
      ) : null}
      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading eligible measurements…
        </Typography>
      ) : measurements.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No verified measurements in this billing period for the selected
          contractor.
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {measurements.map((m) => {
            const alreadyBilled = billedIds?.has(m.id) ?? false;
            const isSelected = selected.has(m.id);
            return (
              <FormControlLabel
                key={m.id}
                disabled={disabled || (alreadyBilled && !isSelected)}
                control={
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => toggle(m.id, e.target.checked)}
                    slotProps={{
                      input: {
                        'aria-label': `Select ${m.measurementNumber}`,
                      },
                    }}
                    data-testid={`measurement-check-${m.id}`}
                  />
                }
                label={
                  <Stack spacing={0}>
                    <Typography variant="body2">
                      {m.measurementNumber} · {m.boqCode ?? 'BOQ'} ·{' '}
                      {formatQuantity(m.currentQuantity)} {m.unit}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(m.measurementDate)} · {m.location}
                      {alreadyBilled ? ' · already on an open bill' : ''}
                    </Typography>
                  </Stack>
                }
              />
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
