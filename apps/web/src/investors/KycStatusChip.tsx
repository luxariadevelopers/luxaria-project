import { Chip } from '@mui/material';
import { InvestorKycStatus } from './types';
import { kycStatusLabel } from './kycState';

type Props = {
  status: string;
};

export function KycStatusChip({ status }: Props) {
  const color =
    status === InvestorKycStatus.Verified
      ? 'success'
      : status === InvestorKycStatus.Rejected
        ? 'error'
        : 'warning';

  return (
    <Chip
      size="small"
      label={kycStatusLabel(status)}
      color={color}
      variant={status === InvestorKycStatus.Rejected ? 'filled' : 'outlined'}
      data-testid="investor-kyc-chip"
      data-kyc-status={status}
    />
  );
}
