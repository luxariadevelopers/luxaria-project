import { Chip } from '@mui/material';
import { unitStatusLabel } from './labels';
import { UnitStatus, type UnitStatus as Status } from './types';

type Props = {
  status: Status | string;
};

function chipColour(
  status: string,
): 'default' | 'success' | 'warning' | 'info' | 'error' {
  switch (status) {
    case UnitStatus.Available:
      return 'success';
    case UnitStatus.Held:
    case UnitStatus.Reserved:
      return 'warning';
    case UnitStatus.Booked:
    case UnitStatus.AgreementExecuted:
      return 'info';
    case UnitStatus.Registered:
      return 'success';
    case UnitStatus.Cancelled:
    case UnitStatus.Blocked:
      return 'error';
    default:
      return 'default';
  }
}

export function UnitStatusChip({ status }: Props) {
  return (
    <Chip
      size="small"
      label={unitStatusLabel(status)}
      color={chipColour(status)}
      variant={status === UnitStatus.Available ? 'filled' : 'outlined'}
    />
  );
}
