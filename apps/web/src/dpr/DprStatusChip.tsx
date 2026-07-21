import { Chip } from '@mui/material';
import { dprStatusLabel } from './labels';
import { DprStatus } from './types';

type Props = {
  status: string;
};

export function DprStatusChip({ status }: Props) {
  const color =
    status === DprStatus.Approved ||
    status === DprStatus.Reviewed ||
    status === DprStatus.Locked
      ? 'success'
      : status === DprStatus.Verified
        ? 'secondary'
        : status === DprStatus.Submitted
          ? 'info'
          : status === DprStatus.Reopened
            ? 'warning'
            : status === DprStatus.Draft
              ? 'default'
              : 'default';

  const filled =
    status === DprStatus.Approved ||
    status === DprStatus.Reviewed ||
    status === DprStatus.Locked;

  return (
    <Chip
      size="small"
      color={color}
      variant={filled ? 'filled' : 'outlined'}
      label={dprStatusLabel(status)}
      data-testid="dpr-status-chip"
    />
  );
}
