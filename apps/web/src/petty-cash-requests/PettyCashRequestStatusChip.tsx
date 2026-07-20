import { Chip } from '@mui/material';
import { pettyCashRequestStatusLabel } from './labels';
import { PettyCashRequirementStatus } from './types';

type Props = {
  status: string;
};

export function PettyCashRequestStatusChip({ status }: Props) {
  const color =
    status === PettyCashRequirementStatus.Approved ||
    status === PettyCashRequirementStatus.Funded ||
    status === PettyCashRequirementStatus.Closed
      ? 'success'
      : status === PettyCashRequirementStatus.Rejected ||
          status === PettyCashRequirementStatus.Cancelled
        ? 'default'
        : status === PettyCashRequirementStatus.Returned
          ? 'warning'
          : status === PettyCashRequirementStatus.Submitted ||
              status === PettyCashRequirementStatus.ProjectManagerReview ||
              status === PettyCashRequirementStatus.FinanceReview
            ? 'info'
            : 'warning';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === PettyCashRequirementStatus.Approved ||
        status === PettyCashRequirementStatus.Funded
          ? 'filled'
          : 'outlined'
      }
      label={pettyCashRequestStatusLabel(status)}
      data-testid="petty-cash-request-status-chip"
    />
  );
}
