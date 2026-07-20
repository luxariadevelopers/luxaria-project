import { Chip } from '@mui/material';
import { agreementStatusLabel } from './labels';
import { ContractorAgreementStatus } from './types';

type Props = {
  status: ContractorAgreementStatus;
};

export function AgreementStatusChip({ status }: Props) {
  const color =
    status === ContractorAgreementStatus.Active
      ? 'success'
      : status === ContractorAgreementStatus.PendingApproval
        ? 'info'
        : status === ContractorAgreementStatus.Rejected ||
            status === ContractorAgreementStatus.Terminated ||
            status === ContractorAgreementStatus.Expired
          ? 'error'
          : status === ContractorAgreementStatus.Superseded
            ? 'default'
            : 'warning';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === ContractorAgreementStatus.Active ? 'filled' : 'outlined'
      }
      label={agreementStatusLabel(status)}
      data-testid="agreement-status-chip"
    />
  );
}
