import { Chip } from '@mui/material';
import {
  getDisplaySeverity,
  getSeverityLabel,
  type NotificationDisplaySeverity,
} from './severity';

const COLOR: Record<
  NotificationDisplaySeverity,
  'default' | 'info' | 'warning' | 'error'
> = {
  info: 'info',
  warning: 'warning',
  critical: 'error',
};

type Props = {
  eventType: string;
  size?: 'small' | 'medium';
};

/** Display severity badge derived from `eventType` (API has no severity field). */
export function NotificationSeverityBadge({
  eventType,
  size = 'small',
}: Props) {
  const severity = getDisplaySeverity(eventType);
  return (
    <Chip
      size={size}
      color={COLOR[severity]}
      variant="outlined"
      label={getSeverityLabel(severity)}
    />
  );
}
