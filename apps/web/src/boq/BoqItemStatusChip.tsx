import { Chip } from '@mui/material';
import { boqItemStatusLabel } from './labels';
import { BoqItemStatus } from './types';

const COLOR: Record<
  BoqItemStatus,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  [BoqItemStatus.Draft]: 'default',
  [BoqItemStatus.Active]: 'success',
  [BoqItemStatus.OnHold]: 'warning',
  [BoqItemStatus.Completed]: 'info',
  [BoqItemStatus.Cancelled]: 'error',
};

type Props = {
  status: BoqItemStatus;
  size?: 'small' | 'medium';
};

export function BoqItemStatusChip({ status, size = 'small' }: Props) {
  return (
    <Chip
      size={size}
      label={boqItemStatusLabel(status)}
      color={COLOR[status]}
      variant="outlined"
    />
  );
}
