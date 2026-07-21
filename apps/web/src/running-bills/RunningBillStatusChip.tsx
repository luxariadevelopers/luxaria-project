import { Chip } from '@mui/material';
import { runningBillStatusLabel } from './labels';
import { ContractorBillStatus } from './types';

type Props = {
  status: string;
};

export function RunningBillStatusChip({ status }: Props) {
  const color =
    status === ContractorBillStatus.Posted ||
    status === ContractorBillStatus.Paid ||
    status === ContractorBillStatus.Closed
      ? 'success'
      : status === ContractorBillStatus.Rejected ||
          status === ContractorBillStatus.Cancelled
        ? 'default'
        : status === ContractorBillStatus.FinanceVerified ||
            status === ContractorBillStatus.DirectorApproved ||
            status === ContractorBillStatus.PartiallyPaid
          ? 'warning'
          : status === ContractorBillStatus.Claimed ||
              status === ContractorBillStatus.EngineerVerified ||
              status === ContractorBillStatus.PmCertified
            ? 'info'
            : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === ContractorBillStatus.Paid ||
        status === ContractorBillStatus.Posted ||
        status === ContractorBillStatus.Closed
          ? 'filled'
          : 'outlined'
      }
      label={runningBillStatusLabel(status)}
      data-testid="running-bill-status-chip"
    />
  );
}
