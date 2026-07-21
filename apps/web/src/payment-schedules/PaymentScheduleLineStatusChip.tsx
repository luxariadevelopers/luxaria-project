import { Chip } from '@mui/material';
import { lineStatusLabel } from './labels';
import { PaymentScheduleLineStatus } from './types';

const COLOR: Record<
  (typeof PaymentScheduleLineStatus)[keyof typeof PaymentScheduleLineStatus],
  'default' | 'warning' | 'success' | 'error' | 'info'
> = {
  [PaymentScheduleLineStatus.Pending]: 'default',
  [PaymentScheduleLineStatus.Due]: 'info',
  [PaymentScheduleLineStatus.Demanded]: 'warning',
  [PaymentScheduleLineStatus.Overdue]: 'error',
  [PaymentScheduleLineStatus.Paid]: 'success',
  [PaymentScheduleLineStatus.Waived]: 'default',
};

type Props = {
  status: string;
};

export function PaymentScheduleLineStatusChip({ status }: Props) {
  const key = status as keyof typeof COLOR;
  return (
    <Chip
      size="small"
      label={lineStatusLabel(status)}
      color={COLOR[key] ?? 'default'}
      variant="outlined"
    />
  );
}
