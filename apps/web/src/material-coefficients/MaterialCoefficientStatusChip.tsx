import { Chip } from '@mui/material';
import { materialCoefficientStatusLabel } from './labels';
import { MaterialCoefficientStatus } from './types';

const STATUS_COLOR: Record<
  MaterialCoefficientStatus,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
> = {
  [MaterialCoefficientStatus.Draft]: 'default',
  [MaterialCoefficientStatus.PendingApproval]: 'warning',
  [MaterialCoefficientStatus.Active]: 'success',
  [MaterialCoefficientStatus.Superseded]: 'info',
  [MaterialCoefficientStatus.Rejected]: 'error',
};

type Props = {
  status: MaterialCoefficientStatus;
};

export function MaterialCoefficientStatusChip({ status }: Props) {
  return (
    <Chip
      size="small"
      label={materialCoefficientStatusLabel(status)}
      color={STATUS_COLOR[status]}
      variant="outlined"
    />
  );
}
