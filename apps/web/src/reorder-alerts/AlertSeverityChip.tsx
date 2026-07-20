import { Chip } from '@mui/material';
import { alertSeverity } from './alertSeverity';
import { alertSeverityLabel } from './labels';
import { AlertSeverity } from './types';

type Props = {
  alertType: string;
};

export function AlertSeverityChip({ alertType }: Props) {
  const severity = alertSeverity(alertType);
  const color =
    severity === AlertSeverity.Critical
      ? 'error'
      : severity === AlertSeverity.High
        ? 'warning'
        : severity === AlertSeverity.Medium
          ? 'info'
          : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={severity === AlertSeverity.Critical ? 'filled' : 'outlined'}
      label={alertSeverityLabel(severity)}
      data-testid="alert-severity-chip"
    />
  );
}
