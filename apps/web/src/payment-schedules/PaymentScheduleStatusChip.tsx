import { Chip } from '@mui/material';
import { scheduleStatusLabel } from './labels';
import { PaymentScheduleStatus } from './types';

const COLOR: Record<
  (typeof PaymentScheduleStatus)[keyof typeof PaymentScheduleStatus],
  'default' | 'warning' | 'success' | 'error' | 'info'
> = {
  [PaymentScheduleStatus.Draft]: 'warning',
  [PaymentScheduleStatus.PendingApproval]: 'info',
  [PaymentScheduleStatus.Active]: 'success',
  [PaymentScheduleStatus.Superseded]: 'default',
  [PaymentScheduleStatus.Cancelled]: 'default',
  [PaymentScheduleStatus.Rejected]: 'error',
};

type Props = {
  status: string;
};

export function PaymentScheduleStatusChip({ status }: Props) {
  const key = status as keyof typeof COLOR;
  return (
    <Chip
      size="small"
      label={scheduleStatusLabel(status)}
      color={COLOR[key] ?? 'default'}
      variant="outlined"
    />
  );
}
