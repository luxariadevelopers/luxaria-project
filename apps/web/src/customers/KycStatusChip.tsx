import { Chip } from '@mui/material';
import { CustomerKycStatus } from './types';
import { kycStatusLabel } from './kycState';

type Props = {
  status: string;
};

export function KycStatusChip({ status }: Props) {
  const color =
    status === CustomerKycStatus.Verified
      ? 'success'
      : status === CustomerKycStatus.Rejected
        ? 'error'
        : 'warning';

  return (
    <Chip
      size="small"
      label={kycStatusLabel(status)}
      color={color}
      variant={status === CustomerKycStatus.Rejected ? 'filled' : 'outlined'}
      data-testid="customer-kyc-chip"
      data-kyc-status={status}
    />
  );
}
