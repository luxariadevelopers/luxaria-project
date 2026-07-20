import { Chip, type ChipProps } from '@mui/material';
import { workMeasurementStatusLabel } from './labels';
import {
  WorkMeasurementStatus,
  type WorkMeasurementStatus as Status,
} from './types';

const STATUS_COLOR: Record<
  Status,
  ChipProps['color']
> = {
  [WorkMeasurementStatus.Draft]: 'default',
  [WorkMeasurementStatus.Submitted]: 'info',
  [WorkMeasurementStatus.Verified]: 'success',
  [WorkMeasurementStatus.Rejected]: 'error',
  [WorkMeasurementStatus.Cancelled]: 'default',
};

type Props = {
  status: Status | string;
};

export function MeasurementStatusChip({ status }: Props) {
  const normalized = status as Status;
  return (
    <Chip
      size="small"
      label={workMeasurementStatusLabel(status)}
      color={STATUS_COLOR[normalized] ?? 'default'}
      variant={normalized === WorkMeasurementStatus.Cancelled ? 'outlined' : 'filled'}
    />
  );
}
