import Chip from '@mui/material/Chip';
import { shortfallSeverity } from './shortfallSeverity';
import { ShortfallSeverity } from './types';

type Props = {
  consecutiveDays: number;
  alertType: string;
};

export function ConsecutiveDayIndicator({
  consecutiveDays,
  alertType,
}: Props) {
  const severity = shortfallSeverity(alertType);
  return (
    <Chip
      size="small"
      color={severity === ShortfallSeverity.Critical ? 'error' : 'warning'}
      label={`${consecutiveDays} day${consecutiveDays === 1 ? '' : 's'}`}
      data-testid="consecutive-day-indicator"
    />
  );
}
