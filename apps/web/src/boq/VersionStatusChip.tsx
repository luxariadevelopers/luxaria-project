import { Chip } from '@mui/material';
import { boqVersionStatusLabel } from './labels';
import { BoqVersionStatus } from './types';

const COLOR: Record<
  BoqVersionStatus,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  [BoqVersionStatus.Draft]: 'default',
  [BoqVersionStatus.PendingApproval]: 'warning',
  [BoqVersionStatus.Active]: 'success',
  [BoqVersionStatus.Superseded]: 'info',
  [BoqVersionStatus.Rejected]: 'error',
};

type Props = {
  status: BoqVersionStatus;
  size?: 'small' | 'medium';
};

export function VersionStatusChip({ status, size = 'small' }: Props) {
  return (
    <Chip
      size={size}
      label={boqVersionStatusLabel(status)}
      color={COLOR[status]}
      variant="outlined"
    />
  );
}
